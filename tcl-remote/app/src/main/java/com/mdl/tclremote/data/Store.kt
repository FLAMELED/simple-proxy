package com.mdl.tclremote.data

import android.content.Context
import android.content.SharedPreferences
import com.mdl.tclremote.atv.Keys
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

enum class StepType { POWER_ON, POWER_OFF, KEY, APP, DELAY, IR_POWER }

/** Un paso de una escena. [value] es el código de tecla, el enlace de la app o los segundos de espera. */
data class Step(val type: StepType, val value: String = "", val count: Int = 1) {
    fun describe(apps: List<AppShortcut>): String = when (type) {
        StepType.POWER_ON -> "Encender TV"
        StepType.POWER_OFF -> "Apagar TV"
        StepType.IR_POWER -> "Encender/apagar por infrarrojo"
        StepType.DELAY -> "Esperar $value s"
        StepType.APP -> "Abrir " + (apps.firstOrNull { it.link == value }?.name ?: value)
        StepType.KEY -> Keys.label(value.toIntOrNull() ?: 0) + if (count > 1) " ×$count" else ""
    }
}

data class Scene(val id: String, val name: String, val steps: List<Step>)

data class Schedule(
    val id: String,
    val hour: Int,
    val minute: Int,
    /** Días con la numeración de java.util.Calendar (1 = domingo). Vacío = todos los días. */
    val days: Set<Int>,
    val sceneId: String,
    val enabled: Boolean,
)

/** [icon] es el paquete del que descargar el logo (vacío = deducirlo del nombre o del enlace). */
data class AppShortcut(val name: String, val link: String, val icon: String = "")

fun newId(): String = UUID.randomUUID().toString()

/** Opción de sí/no guardada en preferencias y observable desde la interfaz. */
class Flag internal constructor(private val key: String, private val default: Boolean) {
    private val _value = MutableStateFlow(default)
    val value: StateFlow<Boolean> = _value
    val enabled get() = _value.value

    internal fun load(prefs: SharedPreferences) {
        _value.value = prefs.getBoolean(key, default)
    }

    fun set(enabled: Boolean) {
        _value.value = enabled
        Store.prefs.edit().putBoolean(key, enabled).apply()
    }
}

/** Guarda la configuración en SharedPreferences y la expone como StateFlow para la interfaz. */
object Store {
    private const val APPS_VERSION = 2
    private const val SPOTIFY_LINK = "spotify://"
    private const val OLD_SPOTIFY_LINK = "market://launch?id=com.spotify.tv.android"

    internal lateinit var prefs: SharedPreferences

    /** Botones de volumen del móvil controlan la TV mientras la app está abierta. */
    val volumeKeys = Flag("volume_keys", true)
    val keepScreenOn = Flag("keep_screen_on", false)
    val dynamicColor = Flag("dynamic_color", false)
    val pauseOnCall = Flag("pause_on_call", false)
    val controlNotification = Flag("control_notification", false)
    val shakeToMute = Flag("shake_to_mute", false)
    val touchpad = Flag("touchpad", false)
    val onboardingDone = Flag("onboarding_done", false)
    private val flags = listOf(
        volumeKeys, keepScreenOn, dynamicColor, pauseOnCall, controlNotification, shakeToMute, touchpad, onboardingDone,
    )

    private val _favorites = MutableStateFlow<List<String>>(emptyList())
    /** Enlaces de las apps favoritas (se muestran en el mando y en el widget de apps). */
    val favorites: StateFlow<List<String>> = _favorites

    private val _sleepAt = MutableStateFlow(0L)
    /** Hora (ms) a la que el temporizador apagará la TV; 0 si no hay temporizador. */
    val sleepAt: StateFlow<Long> = _sleepAt

    private val _host = MutableStateFlow("")
    val host: StateFlow<String> = _host
    private val _paired = MutableStateFlow(false)
    val paired: StateFlow<Boolean> = _paired
    private val _scenes = MutableStateFlow<List<Scene>>(emptyList())
    val scenes: StateFlow<List<Scene>> = _scenes
    private val _schedules = MutableStateFlow<List<Schedule>>(emptyList())
    val schedules: StateFlow<List<Schedule>> = _schedules
    private val _apps = MutableStateFlow<List<AppShortcut>>(emptyList())
    val apps: StateFlow<List<AppShortcut>> = _apps
    private val _irCode = MutableStateFlow("")
    val irCode: StateFlow<String> = _irCode
    private val _widgetScenes = MutableStateFlow<List<String>>(emptyList())
    val widgetScenes: StateFlow<List<String>> = _widgetScenes

    fun init(context: Context) {
        if (::prefs.isInitialized) return
        prefs = context.getSharedPreferences("tclremote", Context.MODE_PRIVATE)
        _host.value = prefs.getString("host", "") ?: ""
        _paired.value = prefs.getBoolean("paired", false)
        _irCode.value = prefs.getString("ir_code", "") ?: ""
        _scenes.value = prefs.getString("scenes", null)?.let(::parseScenes) ?: defaultScenes()
        _schedules.value = prefs.getString("schedules", null)?.let(::parseSchedules) ?: emptyList()
        _apps.value = prefs.getString("apps", null)?.let(::parseApps)?.map {
            // La TV no abría Spotify con el enlace market:// de la primera versión.
            if (it.link == OLD_SPOTIFY_LINK) it.copy(link = SPOTIFY_LINK) else it
        } ?: defaultApps
        flags.forEach { it.load(prefs) }
        // Quien ya vinculó con una versión anterior no necesita el asistente de primer uso.
        if (_paired.value && !onboardingDone.enabled) onboardingDone.set(true)
        _sleepAt.value = prefs.getLong("sleep_at", 0L).takeIf { it > System.currentTimeMillis() } ?: 0L
        if (prefs.getInt("apps_version", 1) < APPS_VERSION) {
            // Pasa a la lista completa de apps de la TV, conservando las que se añadieron a mano.
            val firstVersionLinks = setOf(
                "https://www.youtube.com", "https://www.netflix.com/title", "https://app.primevideo.com",
                "https://www.disneyplus.com", "market://launch?id=com.wbd.stream", SPOTIFY_LINK, OLD_SPOTIFY_LINK,
            )
            val custom = _apps.value.filter { it.link !in firstVersionLinks && defaultApps.none { d -> d.link == it.link } }
            setApps(defaultApps + custom)
            prefs.edit().putInt("apps_version", APPS_VERSION).apply()
        }
        _favorites.value = prefs.getString("favorites", null)?.let { s ->
            JSONArray(s).let { a -> List(a.length()) { a.getString(it) } }
        } ?: _apps.value.take(5).map { it.link }
        _widgetScenes.value = prefs.getString("widget_scenes", null)?.let { s ->
            JSONArray(s).let { a -> List(a.length()) { a.getString(it) } }
        } ?: _scenes.value.take(2).map { it.id }
    }

    fun setHost(value: String) {
        val v = value.trim()
        _host.value = v
        prefs.edit().putString("host", v).apply()
    }

    fun setPaired(value: Boolean) {
        _paired.value = value
        prefs.edit().putBoolean("paired", value).apply()
    }

    /** "" = sin infrarrojo, "candidate:N" = código predefinido, o un código Pronto. */
    fun setIrCode(value: String) {
        _irCode.value = value.trim()
        prefs.edit().putString("ir_code", value.trim()).apply()
    }

    fun saveScene(scene: Scene) {
        val list = _scenes.value.toMutableList()
        val i = list.indexOfFirst { it.id == scene.id }
        if (i >= 0) list[i] = scene else list += scene
        _scenes.value = list
        persistScenes()
    }

    fun deleteScene(id: String) {
        _scenes.value = _scenes.value.filterNot { it.id == id }
        persistScenes()
        _schedules.value.filter { it.sceneId == id }.forEach { deleteSchedule(it.id) }
        setWidgetScenes(_widgetScenes.value.filterNot { it == id })
    }

    fun scene(id: String) = _scenes.value.firstOrNull { it.id == id }

    fun saveSchedule(schedule: Schedule) {
        val list = _schedules.value.toMutableList()
        val i = list.indexOfFirst { it.id == schedule.id }
        if (i >= 0) list[i] = schedule else list += schedule
        _schedules.value = list.sortedWith(compareBy({ it.hour }, { it.minute }))
        persistSchedules()
    }

    fun deleteSchedule(id: String) {
        _schedules.value = _schedules.value.filterNot { it.id == id }
        persistSchedules()
    }

    fun schedule(id: String) = _schedules.value.firstOrNull { it.id == id }

    fun setApps(list: List<AppShortcut>) {
        _apps.value = list
        prefs.edit().putString("apps", JSONArray(list.map {
            JSONObject().put("name", it.name).put("link", it.link).put("icon", it.icon)
        }).toString()).apply()
    }

    fun isFavorite(app: AppShortcut) = app.link in _favorites.value

    fun toggleFavorite(app: AppShortcut) {
        val list = _favorites.value
        setFavorites(if (app.link in list) list - app.link else list + app.link)
    }

    private fun setFavorites(links: List<String>) {
        _favorites.value = links
        prefs.edit().putString("favorites", JSONArray(links).toString()).apply()
    }

    /** Favoritas en el orden de la lista de apps. */
    fun favoriteApps(): List<AppShortcut> = _apps.value.filter { it.link in _favorites.value }

    fun setSleepAt(at: Long) {
        _sleepAt.value = at
        prefs.edit().putLong("sleep_at", at).apply()
    }

    /** Mueve la app de la posición [from] a [to] (para ordenar la cuadrícula). */
    fun moveApp(from: Int, to: Int) {
        val list = _apps.value.toMutableList()
        if (from !in list.indices || to !in list.indices || from == to) return
        list.add(to, list.removeAt(from))
        setApps(list)
    }

    fun setWidgetScenes(ids: List<String>) {
        _widgetScenes.value = ids
        prefs.edit().putString("widget_scenes", JSONArray(ids).toString()).apply()
    }

    private fun persistScenes() {
        prefs.edit().putString("scenes", JSONArray(_scenes.value.map { scene ->
            JSONObject().put("id", scene.id).put("name", scene.name).put("steps", JSONArray(scene.steps.map {
                JSONObject().put("type", it.type.name).put("value", it.value).put("count", it.count)
            }))
        }).toString()).apply()
    }

    private fun persistSchedules() {
        prefs.edit().putString("schedules", JSONArray(_schedules.value.map {
            JSONObject().put("id", it.id).put("hour", it.hour).put("minute", it.minute)
                .put("days", JSONArray(it.days.sorted())).put("scene", it.sceneId).put("enabled", it.enabled)
        }).toString()).apply()
    }

    private fun parseScenes(json: String): List<Scene> = JSONArray(json).objects().map { o ->
        Scene(o.getString("id"), o.getString("name"), o.getJSONArray("steps").objects().mapNotNull { s ->
            runCatching { StepType.valueOf(s.getString("type")) }.getOrNull()?.let {
                Step(it, s.optString("value"), s.optInt("count", 1))
            }
        })
    }

    private fun parseSchedules(json: String): List<Schedule> = JSONArray(json).objects().map { o ->
        val days = o.getJSONArray("days")
        Schedule(
            o.getString("id"), o.getInt("hour"), o.getInt("minute"),
            List(days.length()) { days.getInt(it) }.toSet(), o.getString("scene"), o.getBoolean("enabled"),
        )
    }

    private fun parseApps(json: String): List<AppShortcut> =
        JSONArray(json).objects().map { AppShortcut(it.getString("name"), it.getString("link"), it.optString("icon")) }

    private fun JSONArray.objects() = List(length()) { getJSONObject(it) }

    private fun tvApp(name: String, pkg: String, icon: String = "") = AppShortcut(name, "market://launch?id=$pkg", icon)

    /** Apps instaladas en la TCL 65C6K (según «Tus apps»), en el mismo orden que en la TV. */
    val defaultApps = listOf(
        AppShortcut("Disney+", "https://www.disneyplus.com", "com.disney.disneyplus"),
        AppShortcut("Netflix", "https://www.netflix.com/title", "com.netflix.mediaclient"),
        AppShortcut("Spotify", SPOTIFY_LINK, "com.spotify.music"),
        AppShortcut("YouTube", "https://www.youtube.com", "com.google.android.youtube"),
        AppShortcut("Prime Video", "https://app.primevideo.com", "com.amazon.avod.thirdpartyclient"),
        tvApp("Crunchyroll", "com.crunchyroll.crunchyroid"),
        tvApp("HBO Max", "com.wbd.stream"),
        tvApp("Paramount+", "com.cbs.ott", "com.cbs.app"),
        tvApp("Apple TV", "com.apple.atve.androidtv.appletv"),
        tvApp("Stremio", "com.stremio.one"),
        tvApp("Kick", "com.kick.mobile"),
        tvApp("TCL Channel", "com.tcl.waterfall.overseas"),
        tvApp("iQIYI", "com.iqiyi.i18n.tv", "com.iqiyi.i18n"),
        tvApp("YouTube Music", "com.google.android.youtube.tvmusic", "com.google.android.apps.youtube.music"),
        tvApp("ESPN", "com.espn.score_center"),
        tvApp("Tubi", "com.tubitv"),
        tvApp("Twitch", "tv.twitch.android.viewer", "tv.twitch.android.app"),
        tvApp("DAZN", "com.dazn"),
        tvApp("Downloader", "com.esaba.downloader"),
        tvApp("BrowseHere", "com.tcl.browser"),
    )

    private fun defaultScenes() = listOf(
        Scene(newId(), "Ver YouTube", listOf(
            Step(StepType.POWER_ON),
            Step(StepType.DELAY, "6"),
            Step(StepType.APP, "https://www.youtube.com"),
        )),
        Scene(newId(), "Apagar", listOf(Step(StepType.POWER_OFF))),
        Scene(newId(), "Noche (volumen bajo)", listOf(
            Step(StepType.KEY, Keys.VOLUME_DOWN.toString(), 5),
        )),
    ).also { _scenes.value = it; persistScenes() }
}

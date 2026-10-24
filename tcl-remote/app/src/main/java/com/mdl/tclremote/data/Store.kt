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

data class AppShortcut(val name: String, val link: String)

enum class AvKind { PICTURE, SOUND }

/** Atajo de modo de imagen o sonido: teclas grabadas recorriendo el menú de la TV. */
data class AvShortcut(val id: String, val kind: AvKind, val name: String, val steps: List<Step>) {
    val isRecorded get() = steps.isNotEmpty()
    fun asScene() = Scene(id, name, steps)
}

fun newId(): String = UUID.randomUUID().toString()

/** Guarda la configuración en SharedPreferences y la expone como StateFlow para la interfaz. */
object Store {
    private lateinit var prefs: SharedPreferences

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
    private val _avShortcuts = MutableStateFlow<List<AvShortcut>>(emptyList())
    val avShortcuts: StateFlow<List<AvShortcut>> = _avShortcuts

    fun init(context: Context) {
        if (::prefs.isInitialized) return
        prefs = context.getSharedPreferences("tclremote", Context.MODE_PRIVATE)
        _host.value = prefs.getString("host", "") ?: ""
        _paired.value = prefs.getBoolean("paired", false)
        _irCode.value = prefs.getString("ir_code", "") ?: ""
        _scenes.value = prefs.getString("scenes", null)?.let(::parseScenes) ?: defaultScenes()
        _schedules.value = prefs.getString("schedules", null)?.let(::parseSchedules) ?: emptyList()
        _apps.value = prefs.getString("apps", null)?.let(::parseApps) ?: defaultApps
        _widgetScenes.value = prefs.getString("widget_scenes", null)?.let { s ->
            JSONArray(s).let { a -> List(a.length()) { a.getString(it) } }
        } ?: _scenes.value.take(2).map { it.id }
        _avShortcuts.value = prefs.getString("av_shortcuts", null)?.let(::parseAvShortcuts) ?: defaultAvShortcuts()
    }

    fun saveAvShortcut(shortcut: AvShortcut) {
        val list = _avShortcuts.value.toMutableList()
        val i = list.indexOfFirst { it.id == shortcut.id }
        if (i >= 0) list[i] = shortcut else list += shortcut
        _avShortcuts.value = list
        persistAvShortcuts()
    }

    fun deleteAvShortcut(id: String) {
        _avShortcuts.value = _avShortcuts.value.filterNot { it.id == id }
        persistAvShortcuts()
    }

    private fun persistAvShortcuts() {
        prefs.edit().putString("av_shortcuts", JSONArray(_avShortcuts.value.map {
            JSONObject().put("id", it.id).put("kind", it.kind.name).put("name", it.name).put("steps", stepsToJson(it.steps))
        }).toString()).apply()
    }

    private fun parseAvShortcuts(json: String): List<AvShortcut> = JSONArray(json).objects().mapNotNull { o ->
        val kind = runCatching { AvKind.valueOf(o.getString("kind")) }.getOrNull() ?: return@mapNotNull null
        AvShortcut(o.getString("id"), kind, o.getString("name"), parseSteps(o.getJSONArray("steps")))
    }

    private fun defaultAvShortcuts() = (
        listOf("Estándar", "Vívido", "Película", "Deporte", "Juego", "Inteligente").map {
            AvShortcut(newId(), AvKind.PICTURE, it, emptyList())
        } + listOf("Estándar", "Película", "Música", "Voz", "Deporte", "Juego").map {
            AvShortcut(newId(), AvKind.SOUND, it, emptyList())
        }
    ).also { _avShortcuts.value = it; persistAvShortcuts() }

    private fun stepsToJson(steps: List<Step>) = JSONArray(steps.map {
        JSONObject().put("type", it.type.name).put("value", it.value).put("count", it.count)
    })

    private fun parseSteps(array: JSONArray): List<Step> = array.objects().mapNotNull { s ->
        runCatching { StepType.valueOf(s.getString("type")) }.getOrNull()?.let {
            Step(it, s.optString("value"), s.optInt("count", 1))
        }
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
            JSONObject().put("name", it.name).put("link", it.link)
        }).toString()).apply()
    }

    fun setWidgetScenes(ids: List<String>) {
        _widgetScenes.value = ids
        prefs.edit().putString("widget_scenes", JSONArray(ids).toString()).apply()
    }

    private fun persistScenes() {
        prefs.edit().putString("scenes", JSONArray(_scenes.value.map { scene ->
            JSONObject().put("id", scene.id).put("name", scene.name).put("steps", stepsToJson(scene.steps))
        }).toString()).apply()
    }

    private fun persistSchedules() {
        prefs.edit().putString("schedules", JSONArray(_schedules.value.map {
            JSONObject().put("id", it.id).put("hour", it.hour).put("minute", it.minute)
                .put("days", JSONArray(it.days.sorted())).put("scene", it.sceneId).put("enabled", it.enabled)
        }).toString()).apply()
    }

    private fun parseScenes(json: String): List<Scene> = JSONArray(json).objects().map { o ->
        Scene(o.getString("id"), o.getString("name"), parseSteps(o.getJSONArray("steps")))
    }

    private fun parseSchedules(json: String): List<Schedule> = JSONArray(json).objects().map { o ->
        val days = o.getJSONArray("days")
        Schedule(
            o.getString("id"), o.getInt("hour"), o.getInt("minute"),
            List(days.length()) { days.getInt(it) }.toSet(), o.getString("scene"), o.getBoolean("enabled"),
        )
    }

    private fun parseApps(json: String): List<AppShortcut> =
        JSONArray(json).objects().map { AppShortcut(it.getString("name"), it.getString("link")) }

    private fun JSONArray.objects() = List(length()) { getJSONObject(it) }

    val defaultApps = listOf(
        AppShortcut("YouTube", "https://www.youtube.com"),
        AppShortcut("Netflix", "https://www.netflix.com/title"),
        AppShortcut("Prime Video", "https://app.primevideo.com"),
        AppShortcut("Disney+", "https://www.disneyplus.com"),
        AppShortcut("Max", "market://launch?id=com.wbd.stream"),
        AppShortcut("Spotify", "market://launch?id=com.spotify.tv.android"),
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

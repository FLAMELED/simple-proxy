package com.mdl.tclremote.system

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.mdl.tclremote.data.Store
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class UpdateInfo(val build: Int, val url: String)

/** Comprueba si hay un APK más nuevo publicado en la release «mi-tcl-latest» de GitHub. */
object Updates {
    private const val RELEASE_API = "https://api.github.com/repos/FLAMELED/simple-proxy/releases/tags/mi-tcl-latest"
    private const val CHECK_EVERY_MS = 6L * 3600 * 1000

    private val _available = MutableStateFlow<UpdateInfo?>(null)
    val available: StateFlow<UpdateInfo?> = _available

    fun installedBuild(context: Context): Long =
        context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode

    /** Devuelve la actualización si existe. Sin [force], como mucho una consulta cada 6 horas. */
    suspend fun check(context: Context, force: Boolean = false): UpdateInfo? = withContext(Dispatchers.IO) {
        val prefs = Store.prefs
        val now = System.currentTimeMillis()
        val installed = installedBuild(context)
        if (!force && now - prefs.getLong("update_checked_at", 0L) < CHECK_EVERY_MS) {
            // Entre consultas se usa lo último que se vio (sobrevive a cerrar la app).
            val build = prefs.getInt("update_build", 0)
            val url = prefs.getString("update_url", null)
            _available.value = if (build > installed && url != null) UpdateInfo(build, url) else null
            return@withContext _available.value
        }
        val info = runCatching { fetch() }.getOrNull() ?: return@withContext _available.value
        prefs.edit().putLong("update_checked_at", now).putInt("update_build", info.build).putString("update_url", info.url).apply()
        val newer = info.takeIf { it.build > installed }
        _available.value = newer
        newer
    }

    fun open(context: Context, info: UpdateInfo) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(info.url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun fetch(): UpdateInfo? {
        val conn = URL(RELEASE_API).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.setRequestProperty("Accept", "application/vnd.github+json")
        try {
            if (conn.responseCode != 200) return null
            val json = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            return parse(json)
        } finally {
            conn.disconnect()
        }
    }

    /** El título de la release es «Mi TCL (build N)» y N coincide con el versionCode del APK. */
    internal fun parse(json: JSONObject): UpdateInfo? {
        val build = Regex("build (\\d+)").find(json.optString("name"))?.groupValues?.get(1)?.toIntOrNull() ?: return null
        val assets = json.optJSONArray("assets") ?: return null
        val url = (0 until assets.length()).map { assets.getJSONObject(it) }
            .firstOrNull { it.optString("name").endsWith(".apk") }?.optString("browser_download_url") ?: return null
        return UpdateInfo(build, url)
    }
}

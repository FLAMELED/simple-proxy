package com.mdl.tclremote.system

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.mdl.tclremote.atv.DebugLog
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.work.SceneWorker
import java.net.Inet4Address
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * «Al llegar a casa»: cuando el móvil se conecta a la WiFi en la que está la TV, tras haber
 * estado fuera un rato, ejecuta la escena elegida. La red de casa se reconoce porque la IP de la
 * TV pertenece a esa red, así que no hace falta el permiso de ubicación para leer el nombre de la WiFi.
 */
object HomeArrival {
    /** Tiempo mínimo fuera de casa para considerar que se ha llegado (evita cortes breves de WiFi). */
    private const val MIN_AWAY_MS = 10 * 60_000L
    /** Tras una llegada, no se repite la escena durante este tiempo. */
    private const val COOLDOWN_MS = 30 * 60_000L
    private const val KEY_AWAY_SINCE = "arrival_away_since"
    private const val KEY_LAST_RUN = "arrival_last_run"
    private const val WORK = "arrival_away_check"

    private fun pendingIntent(context: Context) = PendingIntent.getBroadcast(
        context, 7101, Intent(context, WifiArrivalReceiver::class.java),
        // Mutable: el sistema añade la red conectada como extra.
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )

    /** Activa o desactiva la vigilancia según el ajuste. Se llama al arrancar la app y al cambiar el ajuste. */
    fun sync(context: Context) {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val wm = WorkManager.getInstance(context)
        if (Store.arrival.enabled) {
            val request = NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
            runCatching { cm.registerNetworkCallback(request, pendingIntent(context)) }
                .onFailure { DebugLog.error("vigilar WiFi", it) }
            wm.enqueueUniquePeriodicWork(
                WORK,
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<AwayCheckWorker>(15, TimeUnit.MINUTES).build(),
            )
        } else {
            runCatching { cm.unregisterNetworkCallback(pendingIntent(context)) }
            wm.cancelUniqueWork(WORK)
            Store.prefs.edit().remove(KEY_AWAY_SINCE).apply()
        }
    }

    /** ¿Esta red es la de casa? Lo es si la IP de la TV cae dentro de alguna de sus subredes IPv4. */
    fun isHomeNetwork(context: Context, network: Network?): Boolean {
        network ?: return false
        val tv = parseIpv4(Store.host.value) ?: return false
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val caps = cm.getNetworkCapabilities(network) ?: return false
        if (!caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return false
        val links = cm.getLinkProperties(network) ?: return false
        return links.linkAddresses.any { la ->
            val addr = la.address as? Inet4Address ?: return@any false
            sameSubnet(addr.address, tv, la.prefixLength)
        }
    }

    /** Solo IPs literales: resolver un nombre aquí haría una consulta de red en el hilo principal. */
    internal fun parseIpv4(text: String): ByteArray? {
        val parts = text.trim().split('.')
        if (parts.size != 4) return null
        val bytes = parts.map { it.toIntOrNull()?.takeIf { n -> n in 0..255 } ?: return null }
        return ByteArray(4) { bytes[it].toByte() }
    }

    internal fun sameSubnet(a: ByteArray, b: ByteArray, prefix: Int): Boolean {
        if (a.size != b.size || prefix !in 1..32) return false
        for (bit in 0 until prefix) {
            val byte = bit / 8
            val mask = 0x80 ushr (bit % 8)
            if ((a[byte].toInt() and mask) != (b[byte].toInt() and mask)) return false
        }
        return true
    }

    internal fun inWindow(hour: Int, from: Int, to: Int) = when {
        from == to -> true
        from < to -> hour in from until to
        else -> hour >= from || hour < to
    }

    fun markAway() {
        val prefs = Store.prefs
        if (prefs.getLong(KEY_AWAY_SINCE, 0L) == 0L) prefs.edit().putLong(KEY_AWAY_SINCE, System.currentTimeMillis()).apply()
    }

    /** El móvil está en la WiFi de casa: si venía de fuera, ejecuta la escena. */
    fun onHome(context: Context) {
        val prefs = Store.prefs
        val now = System.currentTimeMillis()
        val awaySince = prefs.getLong(KEY_AWAY_SINCE, 0L)
        prefs.edit().putLong(KEY_AWAY_SINCE, 0L).apply()
        if (awaySince == 0L || now - awaySince < MIN_AWAY_MS) return
        if (now - prefs.getLong(KEY_LAST_RUN, 0L) < COOLDOWN_MS) return
        val config = Store.arrivalConfig.value
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        if (!inWindow(hour, config.fromHour, config.toHour)) return
        val scene = Store.scene(config.sceneId) ?: return
        prefs.edit().putLong(KEY_LAST_RUN, now).apply()
        DebugLog.log("Llegada a casa: ejecutando «${scene.name}»")
        SceneWorker.enqueue(context, scene.id)
    }

    fun handle(context: Context, network: Network?) {
        Store.init(context)
        if (!Store.arrival.enabled || !Store.paired.value) return
        if (isHomeNetwork(context, network)) onHome(context) else markAway()
    }
}

/** Lo despierta el sistema cuando se conecta una red WiFi. */
class WifiArrivalReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val network = if (android.os.Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(ConnectivityManager.EXTRA_NETWORK, Network::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(ConnectivityManager.EXTRA_NETWORK)
        }
        HomeArrival.handle(context, network)
    }
}

/** Cada 15 minutos anota si el móvil está fuera de casa (no hay aviso del sistema al perder la WiFi). */
class AwayCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val cm = applicationContext.getSystemService(ConnectivityManager::class.java)
        HomeArrival.handle(applicationContext, cm.activeNetwork)
        return Result.success()
    }
}

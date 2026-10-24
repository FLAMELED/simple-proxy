package com.mdl.tclremote.atv

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

data class FoundTv(val name: String, val host: String)

/** Busca televisores Google TV en la red WiFi (servicio mDNS _androidtvremote2._tcp). */
object Discovery {
    private const val SERVICE = "_androidtvremote2._tcp."

    fun scan(context: Context): Flow<List<FoundTv>> = callbackFlow {
        val nsd = context.getSystemService(NsdManager::class.java)
        val found = linkedMapOf<String, FoundTv>()
        val pending = ArrayDeque<NsdServiceInfo>()
        var resolving = false

        fun resolveNext() {
            val next = synchronized(pending) {
                if (resolving) return
                pending.removeFirstOrNull()?.also { resolving = true }
            } ?: return
            @Suppress("DEPRECATION")
            nsd.resolveService(next, object : NsdManager.ResolveListener {
                override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                    synchronized(pending) { resolving = false }
                    resolveNext()
                }

                override fun onServiceResolved(info: NsdServiceInfo) {
                    @Suppress("DEPRECATION")
                    val host = info.host?.hostAddress
                    if (host != null) {
                        found[info.serviceName] = FoundTv(info.serviceName, host)
                        trySend(found.values.toList())
                    }
                    synchronized(pending) { resolving = false }
                    resolveNext()
                }
            })
        }

        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                close(IllegalStateException("No se pudo buscar en la red ($errorCode)"))
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
            override fun onServiceFound(info: NsdServiceInfo) {
                synchronized(pending) { pending.addLast(info) }
                resolveNext()
            }
            override fun onServiceLost(info: NsdServiceInfo) {
                found.remove(info.serviceName)
                trySend(found.values.toList())
            }
        }
        trySend(emptyList())
        nsd.discoverServices(SERVICE, NsdManager.PROTOCOL_DNS_SD, listener)
        awaitClose { runCatching { nsd.stopServiceDiscovery(listener) } }
    }
}

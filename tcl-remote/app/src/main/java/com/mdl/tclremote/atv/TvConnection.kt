package com.mdl.tclremote.atv

import android.os.Build
import java.io.Closeable
import java.net.SocketTimeoutException
import javax.net.ssl.SSLSocket

/** Conexión de mando (puerto 6466). Un hilo lee los mensajes de la TV y responde a los ping. */
class TvConnection(private val host: String, private val listener: Listener) : Closeable {
    interface Listener {
        fun onPower(on: Boolean)
        fun onVolume(level: Int, max: Int, muted: Boolean)
        fun onClosed(connection: TvConnection, error: Throwable?)
    }

    private var socket: SSLSocket? = null
    private val writeLock = Any()

    @Volatile var isOpen = false
        private set

    @Volatile var power: Boolean? = null
        private set

    /** Abre la conexión y completa el saludo inicial. Bloqueante. */
    fun open(timeoutMs: Int = 6000) {
        DebugLog.log("Mando: conectando a $host")
        val s = Identity.connect(host, RemoteMessages.PORT, timeoutMs)
        socket = s
        val deadline = System.currentTimeMillis() + timeoutMs
        var active = false
        try {
            while (!active) {
                if (System.currentTimeMillis() > deadline) throw SocketTimeoutException("La TV no respondió")
                val msg = ProtoMessage.parse(Framing.read(s.inputStream))
                if (msg.has(RemoteMessages.FIELD_SET_ACTIVE)) active = true
                handle(msg)
            }
        } catch (e: Exception) {
            DebugLog.error("saludo del mando", e)
            runCatching { s.close() }
            throw e
        }
        DebugLog.log("✓ Mando listo")
        s.soTimeout = 0
        isOpen = true
        Thread({ readLoop(s) }, "tv-reader").apply { isDaemon = true }.start()
    }

    private fun readLoop(s: SSLSocket) {
        var error: Throwable? = null
        try {
            while (isOpen) handle(ProtoMessage.parse(Framing.read(s.inputStream)))
        } catch (e: Exception) {
            error = e
        } finally {
            val wasOpen = isOpen
            isOpen = false
            runCatching { s.close() }
            if (wasOpen) listener.onClosed(this, error)
        }
    }

    private fun handle(msg: ProtoMessage) {
        when {
            msg.has(RemoteMessages.FIELD_CONFIGURE) ->
                send(RemoteMessages.configure(Build.MODEL, Build.MANUFACTURER))
            msg.has(RemoteMessages.FIELD_SET_ACTIVE) -> send(RemoteMessages.setActive())
            msg.has(RemoteMessages.FIELD_PING_REQUEST) ->
                send(RemoteMessages.pingResponse(msg.message(RemoteMessages.FIELD_PING_REQUEST)?.int(1) ?: 0))
            msg.has(RemoteMessages.FIELD_START) -> {
                val on = msg.message(RemoteMessages.FIELD_START)?.bool(1) ?: false
                power = on
                listener.onPower(on)
            }
            msg.has(RemoteMessages.FIELD_VOLUME) -> {
                val v = msg.message(RemoteMessages.FIELD_VOLUME) ?: return
                listener.onVolume(v.int(7) ?: 0, v.int(6) ?: 0, v.bool(8) ?: false)
            }
        }
    }

    fun send(payload: ByteArray) {
        val s = socket ?: throw IllegalStateException("Sin conexión")
        synchronized(writeLock) { Framing.write(s.outputStream, payload) }
    }

    fun key(code: Int) = send(RemoteMessages.key(code))

    fun openApp(link: String) = send(RemoteMessages.appLink(link))

    /** Espera a que la TV informe si está encendida (llega justo después del saludo). */
    fun awaitPower(timeoutMs: Long): Boolean? {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (power == null && isOpen && System.currentTimeMillis() < deadline) Thread.sleep(50)
        return power
    }

    override fun close() {
        isOpen = false
        runCatching { socket?.close() }
    }
}

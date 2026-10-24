package com.mdl.tclremote.atv

import android.content.Context
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket
import java.security.KeyStore
import java.security.Principal
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.X509KeyManager
import javax.net.ssl.X509TrustManager

/**
 * Certificado de cliente que la TV recuerda tras la vinculación.
 * Se guarda en el almacenamiento privado de la app. No se usa AndroidKeyStore porque
 * Conscrypt no puede firmar el saludo TLS con esas claves (falla con "RSA routines: internal error").
 */
object Identity {
    private const val ALIAS = "tclremote_client"
    private const val LEGACY_KEYSTORE = "AndroidKeyStore"

    private lateinit var dir: File
    @Volatile private var cached: ClientCert? = null
    @Volatile private var context: SSLContext? = null

    fun init(appContext: Context) {
        dir = File(appContext.filesDir, "identity")
        // Limpia la clave de la primera versión, que no servía.
        runCatching {
            KeyStore.getInstance(LEGACY_KEYSTORE).apply { load(null) }.takeIf { it.containsAlias(ALIAS) }?.deleteEntry(ALIAS)
        }
    }

    @Synchronized
    private fun identity(): ClientCert {
        cached?.let { return it }
        val keyFile = File(dir, "client.key")
        val certFile = File(dir, "client.crt")
        val loaded = if (keyFile.exists() && certFile.exists()) {
            runCatching { ClientCert.load(keyFile.readBytes(), certFile.readBytes()) }.getOrNull()
        } else null
        val id = loaded ?: ClientCert.generate().also {
            dir.mkdirs()
            keyFile.writeBytes(it.keyBytes())
            certFile.writeBytes(it.certBytes())
            DebugLog.log("Certificado nuevo del móvil generado")
        }
        cached = id
        return id
    }

    fun certificate(): X509Certificate = identity().certificate

    /** Borra la identidad: obliga a volver a vincular con la TV. */
    @Synchronized
    fun reset() {
        File(dir, "client.key").delete()
        File(dir, "client.crt").delete()
        cached = null
        context = null
    }

    private val keyManager = object : X509KeyManager {
        override fun getClientAliases(keyType: String?, issuers: Array<out Principal>?) = arrayOf(ALIAS)
        override fun chooseClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, socket: Socket?) = ALIAS
        override fun getServerAliases(keyType: String?, issuers: Array<out Principal>?) = null
        override fun chooseServerAlias(keyType: String?, issuers: Array<out Principal>?, socket: Socket?) = null
        override fun getCertificateChain(alias: String?) = arrayOf(identity().certificate)
        override fun getPrivateKey(alias: String?) = identity().privateKey
    }

    /** La TV usa un certificado autofirmado, así que no se puede validar contra una CA. */
    private val trustAll = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers() = arrayOf<X509Certificate>()
    }

    /** Se recrea tras [reset] para no reanudar sesiones TLS con el certificado anterior. */
    @Synchronized
    private fun sslContext(): SSLContext = context ?: run {
        identity()
        SSLContext.getInstance("TLS").apply { init(arrayOf(keyManager), arrayOf(trustAll), null) }
            .also { context = it }
    }

    fun connect(host: String, port: Int, timeoutMs: Int): SSLSocket {
        val plain = Socket()
        var step = "conectar a $host:$port"
        try {
            plain.connect(InetSocketAddress(host, port), timeoutMs)
            plain.soTimeout = timeoutMs
            plain.tcpNoDelay = true
            DebugLog.log("✓ Conectado a $host:$port")
            step = "preparar certificado del móvil"
            val ctx = sslContext()
            step = "cifrado TLS con $host:$port"
            val ssl = ctx.socketFactory.createSocket(plain, host, port, true) as SSLSocket
            ssl.startHandshake()
            DebugLog.log("✓ TLS ${ssl.session.protocol} con $host:$port")
            return ssl
        } catch (e: Exception) {
            DebugLog.error(step, e)
            plain.close()
            throw e
        }
    }
}

package com.mdl.tclremote.atv

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.math.BigInteger
import java.net.InetSocketAddress
import java.net.Socket
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Principal
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.util.Date
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.X509KeyManager
import javax.net.ssl.X509TrustManager
import javax.security.auth.x500.X500Principal

/**
 * Certificado de cliente que la TV recuerda tras la vinculación.
 * La clave vive en el AndroidKeyStore del teléfono y nunca sale de él.
 */
object Identity {
    private const val ALIAS = "tclremote_client"
    private const val KEYSTORE = "AndroidKeyStore"

    private fun keyStore() = KeyStore.getInstance(KEYSTORE).apply { load(null) }

    fun certificate(): X509Certificate {
        val ks = keyStore()
        if (!ks.containsAlias(ALIAS)) generate()
        return keyStore().getCertificate(ALIAS) as X509Certificate
    }

    /** Borra la identidad: obliga a volver a vincular con la TV. */
    fun reset() {
        val ks = keyStore()
        if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS)
    }

    private fun generate() {
        val now = System.currentTimeMillis()
        val spec = KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
            .setKeySize(2048)
            .setCertificateSubject(X500Principal("CN=atvremote"))
            .setCertificateSerialNumber(BigInteger.valueOf(now))
            .setCertificateNotBefore(Date(now - 24L * 3600 * 1000))
            .setCertificateNotAfter(Date(now + 20L * 365 * 24 * 3600 * 1000))
            .setDigests(
                KeyProperties.DIGEST_NONE,
                KeyProperties.DIGEST_SHA1,
                KeyProperties.DIGEST_SHA256,
                KeyProperties.DIGEST_SHA384,
                KeyProperties.DIGEST_SHA512,
            )
            .setSignaturePaddings(
                KeyProperties.SIGNATURE_PADDING_RSA_PKCS1,
                KeyProperties.SIGNATURE_PADDING_RSA_PSS,
            )
            .build()
        KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, KEYSTORE).run {
            initialize(spec)
            generateKeyPair()
        }
    }

    private val keyManager = object : X509KeyManager {
        override fun getClientAliases(keyType: String?, issuers: Array<out Principal>?) = arrayOf(ALIAS)
        override fun chooseClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, socket: Socket?) = ALIAS
        override fun getServerAliases(keyType: String?, issuers: Array<out Principal>?) = null
        override fun chooseServerAlias(keyType: String?, issuers: Array<out Principal>?, socket: Socket?) = null
        override fun getCertificateChain(alias: String?) = arrayOf(certificate())
        override fun getPrivateKey(alias: String?) = keyStore().getKey(ALIAS, null) as PrivateKey
    }

    /** La TV usa un certificado autofirmado, así que no se puede validar contra una CA. */
    private val trustAll = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) = Unit
        override fun getAcceptedIssuers() = arrayOf<X509Certificate>()
    }

    private val sslContext: SSLContext by lazy {
        certificate()
        SSLContext.getInstance("TLS").apply { init(arrayOf(keyManager), arrayOf(trustAll), null) }
    }

    fun connect(host: String, port: Int, timeoutMs: Int): SSLSocket {
        val plain = Socket()
        try {
            plain.connect(InetSocketAddress(host, port), timeoutMs)
            plain.soTimeout = timeoutMs
            plain.tcpNoDelay = true
            val ssl = sslContext.socketFactory.createSocket(plain, host, port, true) as SSLSocket
            ssl.startHandshake()
            return ssl
        } catch (e: Exception) {
            plain.close()
            throw e
        }
    }
}

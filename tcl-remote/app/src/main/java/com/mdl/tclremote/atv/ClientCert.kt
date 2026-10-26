package com.mdl.tclremote.atv

import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.Signature
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.spec.PKCS8EncodedKeySpec
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Clave RSA y certificado autofirmado con los que el móvil se identifica ante la TV. */
class ClientCert(val privateKey: PrivateKey, val certificate: X509Certificate) {
    fun keyBytes(): ByteArray = privateKey.encoded
    fun certBytes(): ByteArray = certificate.encoded

    companion object {
        fun generate(now: Long = System.currentTimeMillis()): ClientCert {
            val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
            val der = SelfSignedCertificate.build(
                commonName = "atvremote",
                serial = BigInteger.valueOf(now),
                notBefore = Date(now - 24L * 3600 * 1000),
                notAfter = Date(now + 20L * 365 * 24 * 3600 * 1000),
                publicKeyInfo = pair.public.encoded,
                privateKey = pair.private,
            )
            val cert = CertificateFactory.getInstance("X.509").generateCertificate(der.inputStream()) as X509Certificate
            return ClientCert(pair.private, cert)
        }

        fun load(key: ByteArray, cert: ByteArray): ClientCert = ClientCert(
            KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(key)),
            CertificateFactory.getInstance("X.509").generateCertificate(cert.inputStream()) as X509Certificate,
        )
    }
}

/**
 * Certificado X.509 v3 autofirmado (SHA256withRSA, sin extensiones) codificado en DER a mano.
 * Sustituye a BouncyCastle, que añadía varios MB a la app solo para esto.
 */
internal object SelfSignedCertificate {
    private val SHA256_WITH_RSA = byteArrayOf(0x2A, 0x86.toByte(), 0x48, 0x86.toByte(), 0xF7.toByte(), 0x0D, 0x01, 0x01, 0x0B)
    private val COMMON_NAME = byteArrayOf(0x55, 0x04, 0x03)

    fun build(
        commonName: String,
        serial: BigInteger,
        notBefore: Date,
        notAfter: Date,
        publicKeyInfo: ByteArray,
        privateKey: PrivateKey,
    ): ByteArray {
        val algorithm = seq(tlv(0x06, SHA256_WITH_RSA), tlv(0x05, ByteArray(0)))
        val name = seq(tlv(0x31, seq(tlv(0x06, COMMON_NAME), tlv(0x0C, commonName.toByteArray(Charsets.UTF_8)))))
        val tbs = seq(
            tlv(0xA0, tlv(0x02, byteArrayOf(2))), // versión v3
            tlv(0x02, serial.abs().toByteArray()),
            algorithm,
            name,
            seq(time(notBefore), time(notAfter)),
            name,
            publicKeyInfo,
        )
        val signature = Signature.getInstance("SHA256withRSA").run {
            initSign(privateKey)
            update(tbs)
            sign()
        }
        return seq(tbs, algorithm, tlv(0x03, byteArrayOf(0) + signature))
    }

    /** UTCTime hasta 2049 y GeneralizedTime a partir de 2050, como exige RFC 5280. */
    private fun time(date: Date): ByteArray {
        val utc = TimeZone.getTimeZone("UTC")
        val year = java.util.Calendar.getInstance(utc).apply { time = date }.get(java.util.Calendar.YEAR)
        val (tag, pattern) = if (year < 2050) 0x17 to "yyMMddHHmmss'Z'" else 0x18 to "yyyyMMddHHmmss'Z'"
        val text = SimpleDateFormat(pattern, Locale.ROOT).apply { timeZone = utc }.format(date)
        return tlv(tag, text.toByteArray(Charsets.US_ASCII))
    }

    private fun seq(vararg parts: ByteArray) = tlv(0x30, parts.fold(ByteArray(0)) { acc, p -> acc + p })

    fun tlv(tag: Int, content: ByteArray): ByteArray {
        val out = ByteArrayOutputStream(content.size + 6)
        out.write(tag)
        val len = content.size
        when {
            len < 0x80 -> out.write(len)
            len <= 0xFF -> { out.write(0x81); out.write(len) }
            len <= 0xFFFF -> { out.write(0x82); out.write(len shr 8); out.write(len and 0xFF) }
            else -> { out.write(0x83); out.write(len shr 16); out.write((len shr 8) and 0xFF); out.write(len and 0xFF) }
        }
        out.write(content)
        return out.toByteArray()
    }
}

package com.mdl.tclremote.atv

import org.bouncycastle.asn1.x500.X500Name
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder
import java.math.BigInteger
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Date

/** Clave RSA y certificado autofirmado con los que el móvil se identifica ante la TV. */
class ClientCert(val privateKey: PrivateKey, val certificate: X509Certificate) {
    fun keyBytes(): ByteArray = privateKey.encoded
    fun certBytes(): ByteArray = certificate.encoded

    companion object {
        fun generate(now: Long = System.currentTimeMillis()): ClientCert {
            val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
            val name = X500Name("CN=atvremote")
            val builder = JcaX509v3CertificateBuilder(
                name,
                BigInteger.valueOf(now),
                Date(now - 24L * 3600 * 1000),
                Date(now + 20L * 365 * 24 * 3600 * 1000),
                name,
                pair.public,
            )
            val signer = JcaContentSignerBuilder("SHA256withRSA").build(pair.private)
            val cert = JcaX509CertificateConverter().getCertificate(builder.build(signer))
            return ClientCert(pair.private, cert)
        }

        fun load(key: ByteArray, cert: ByteArray): ClientCert = ClientCert(
            KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(key)),
            CertificateFactory.getInstance("X.509").generateCertificate(cert.inputStream()) as X509Certificate,
        )
    }
}

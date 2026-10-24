package com.mdl.tclremote

import com.mdl.tclremote.atv.ClientCert
import com.mdl.tclremote.atv.Framing
import com.mdl.tclremote.atv.PairingMessages
import com.mdl.tclremote.atv.PairingSecret
import com.mdl.tclremote.atv.ProtoMessage
import com.mdl.tclremote.atv.ProtoWriter
import com.mdl.tclremote.atv.RemoteMessages
import com.mdl.tclremote.ir.IrCodes
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.security.Signature
import java.security.interfaces.RSAPublicKey

class ProtocolTest {
    @Test
    fun keyMessageMatchesProtobufEncoding() {
        // remote_key_inject { key_code: 24, direction: SHORT }
        val expected = byteArrayOf(0x52, 0x04, 0x08, 0x18, 0x10, 0x03)
        assertArrayEquals(expected, RemoteMessages.key(24))
    }

    @Test
    fun largeVarintsRoundTrip() {
        val bytes = ProtoWriter().int(1, 622).string(2, "hola").message(3) { bool(1, true) }.toByteArray()
        val msg = ProtoMessage.parse(bytes)
        assertEquals(622, msg.int(1))
        assertEquals("hola", msg.string(2))
        assertEquals(true, msg.message(3)?.bool(1))
    }

    @Test
    fun framingRoundTrip() {
        val payload = ByteArray(300) { it.toByte() }
        val out = ByteArrayOutputStream()
        Framing.write(out, payload)
        assertEquals(302, out.size())
        assertArrayEquals(payload, Framing.read(ByteArrayInputStream(out.toByteArray())))
    }

    @Test
    fun pairingRequestHasStatusAndPayload() {
        val msg = ProtoMessage.parse(PairingMessages.pairingRequest("Xiaomi"))
        assertEquals(2, msg.int(1))
        assertEquals(200, msg.int(2))
        assertEquals("atvremote", msg.message(10)?.string(1))
        assertEquals("Xiaomi", msg.message(10)?.string(2))
    }

    @Test
    fun pairingSecretMatchesReferenceImplementation() {
        val clientModulus = BigInteger(CLIENT_MODULUS, 16)
        val serverModulus = BigInteger(SERVER_MODULUS, 16)
        val e = BigInteger.valueOf(65537)
        val secret = PairingSecret.compute(clientModulus, e, serverModulus, e, "2dabcd")
        assertEquals(EXPECTED_HASH, secret!!.joinToString("") { "%02x".format(it) })
        assertNull(PairingSecret.compute(clientModulus, e, serverModulus, e, "2EABCD"))
    }

    @Test
    fun prontoParsesFrequencyAndPulses() {
        val signal = IrCodes.pronto("0000 006D 0002 0000 0158 00AC 0016 0016")
        assertTrue(signal.frequency in 37900..38100)
        assertEquals(4, signal.pattern.size)
        assertTrue(signal.pattern[0] in 9000..9100)
    }

    @Test
    fun necAndRcaPatternsHaveExpectedLength() {
        assertEquals(2 + 64 + 1, IrCodes.nec(0x04, 0x08).pattern.size)
        assertEquals((2 + 48 + 1) * 2 + 1, IrCodes.rca(0xF, 0x54).pattern.size)
    }

    @Test
    fun clientCertIsSelfSignedRsaAndSurvivesReload() {
        val cert = ClientCert.generate()
        cert.certificate.verify(cert.certificate.publicKey)
        assertEquals(2048, (cert.certificate.publicKey as RSAPublicKey).modulus.bitLength())
        val reloaded = ClientCert.load(cert.keyBytes(), cert.certBytes())
        val data = "hola".toByteArray()
        val sig = Signature.getInstance("SHA256withRSA").apply { initSign(reloaded.privateKey); update(data) }.sign()
        val ok = Signature.getInstance("SHA256withRSA").apply { initVerify(reloaded.certificate); update(data) }.verify(sig)
        assertTrue(ok)
    }

    private companion object {
        const val CLIENT_MODULUS =
            "98f135d25f557203301850c5a38fd547923a736994e3bf911a61dbe22e44158bae97ba94d0eda82f8f6d05584ef8aa38922766581e27a1c08a6a63ec24ede6a46b4cb2424a23d5962217beaddbc496cb8e81973e0becd7b03898d190f9ebdacc0cb1e29c658cda1495e60af593bd04cf0fd630f1f29d0da9953f48f1a09f76b5a170b33839263059f28c105d1fb17c2390c192cfd3ac94af0f21ddb66cad4a268d116ece1738f7d93d9c172411e20b8f6b0d549b6f03675a1600a35a099950d836f675cc81e74ef5e8e25d940ed904759531985d5d9dc9f81818e811892f902bd23f0824128b2f330c5c7fd0a6a3a4506513270e269e0d37f2a74de452e6b439"
        const val SERVER_MODULUS =
            "ff26144b98289fcd59a54a7bb1fee08f571242425051c1ccd17f9acae01f5057ca02135e92b1d3f28ede0d7ac3baea9e13deef86ab1031d0f646e1f40a097c976bf46c697d2caf82eeeacbe226e875555790f82ec1d3fcff2a3af4d46b0a18e8830e07bc1e398f1012bd4acefaecbd389be4bcfc49b64a0872e6cc3ababced2057ee05cde00902c77ebff206867347214cdd2055930d6eaf14f4733f3e7d1bfbc7a2ea20b2f14c942e05319acb5c74273f98e2774cbd87ad5c90a9587403e430ec66a78795e761d17731af10506bf2efc6f877186d76b07e881ed162ae2eb1547f15052434b9b5df9e7769b10f4205b4907a70c31012f037b64ce4228c38fb29"
        const val EXPECTED_HASH = "2d9f1956a35f75fa12a404aa8c58ca313a6fa0c8e9cc3196e3c090e5b0729ae6"
    }
}

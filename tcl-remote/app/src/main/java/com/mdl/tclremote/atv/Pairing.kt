package com.mdl.tclremote.atv

import java.io.Closeable
import java.security.interfaces.RSAPublicKey
import javax.net.ssl.SSLSocket

class PairingException(message: String) : Exception(message)

/**
 * Vinculación: la TV muestra un código de 6 caracteres que el usuario escribe en el teléfono.
 * [start] y [finish] hacen E/S bloqueante; llamarlas fuera del hilo principal.
 */
class PairingSession(private val host: String) : Closeable {
    private var socket: SSLSocket? = null

    fun start(clientName: String) {
        val s = Identity.connect(host, PairingMessages.PORT, 10_000)
        socket = s
        s.soTimeout = 15_000
        exchange(PairingMessages.pairingRequest(clientName), PairingMessages.FIELD_PAIRING_REQUEST_ACK)
        exchange(PairingMessages.options(), PairingMessages.FIELD_OPTIONS)
        exchange(PairingMessages.configuration(), PairingMessages.FIELD_CONFIGURATION_ACK)
        // A partir de aquí la TV muestra el código en pantalla y espera.
        s.soTimeout = 0
    }

    /** Devuelve false si el código no coincide (se puede volver a intentar). */
    fun finish(code: String): Boolean {
        val s = socket ?: throw PairingException("La vinculación no está iniciada")
        val client = Identity.certificate().publicKey as RSAPublicKey
        val server = s.session.peerCertificates.first().publicKey as RSAPublicKey
        val secret = PairingSecret.compute(
            client.modulus, client.publicExponent, server.modulus, server.publicExponent, code,
        ) ?: return false
        s.soTimeout = 15_000
        exchange(PairingMessages.secret(secret), PairingMessages.FIELD_SECRET_ACK)
        close()
        return true
    }

    private fun exchange(request: ByteArray, expectedField: Int): ProtoMessage {
        val s = socket!!
        Framing.write(s.outputStream, request)
        val reply = ProtoMessage.parse(Framing.read(s.inputStream))
        val status = reply.int(2) ?: 0
        if (status != PairingMessages.STATUS_OK) {
            throw PairingException(
                when (status) {
                    402 -> "Código incorrecto"
                    401 -> "La TV rechazó la configuración"
                    else -> "La TV respondió con error $status"
                },
            )
        }
        if (!reply.has(expectedField)) throw PairingException("Respuesta inesperada de la TV")
        return reply
    }

    override fun close() {
        runCatching { socket?.close() }
        socket = null
    }
}

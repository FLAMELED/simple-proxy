package com.mdl.tclremote.atv

import java.math.BigInteger
import java.security.MessageDigest

/**
 * Mensajes del protocolo "Android TV Remote v2" que usa la app oficial de Google TV.
 * Vinculación en el puerto 6467 y mando en el 6466, ambos sobre TLS con certificado de cliente.
 */
object PairingMessages {
    const val PORT = 6467
    const val STATUS_OK = 200

    const val FIELD_PAIRING_REQUEST_ACK = 11
    const val FIELD_OPTIONS = 20
    const val FIELD_CONFIGURATION_ACK = 31
    const val FIELD_SECRET_ACK = 41

    private const val ENCODING_HEXADECIMAL = 3
    private const val CODE_LENGTH = 6
    private const val ROLE_INPUT = 1

    private fun outer(block: ProtoWriter.() -> Unit) =
        ProtoWriter().int(1, 2).int(2, STATUS_OK).apply(block).toByteArray()

    fun pairingRequest(clientName: String) = outer {
        message(10) {
            string(1, "atvremote")
            string(2, clientName)
        }
    }

    fun options() = outer {
        message(20) {
            message(1) { int(1, ENCODING_HEXADECIMAL); int(2, CODE_LENGTH) }
            int(3, ROLE_INPUT)
        }
    }

    fun configuration() = outer {
        message(30) {
            message(1) { int(1, ENCODING_HEXADECIMAL); int(2, CODE_LENGTH) }
            int(2, ROLE_INPUT)
        }
    }

    fun secret(secret: ByteArray) = outer { message(40) { bytes(1, secret) } }
}

object PairingSecret {
    /** Bytes sin signo y sin ceros a la izquierda (igual que convertir el número a hex). */
    fun unsignedBytes(n: BigInteger): ByteArray {
        val raw = n.toByteArray()
        var i = 0
        while (i < raw.size - 1 && raw[i] == 0.toByte()) i++
        return raw.copyOfRange(i, raw.size)
    }

    fun isValidFormat(code: String) = code.trim().matches(Regex("[0-9a-fA-F]{6}"))

    /**
     * Calcula el secreto a partir de las claves públicas y el código de 6 caracteres que muestra la TV.
     * Devuelve null si el código no es correcto (el primer byte del hash debe coincidir con el código).
     */
    fun compute(
        clientModulus: BigInteger,
        clientExponent: BigInteger,
        serverModulus: BigInteger,
        serverExponent: BigInteger,
        code: String,
    ): ByteArray? {
        val c = code.trim().uppercase()
        require(isValidFormat(c)) { "El código debe tener 6 caracteres hexadecimales" }
        val md = MessageDigest.getInstance("SHA-256")
        md.update(unsignedBytes(clientModulus))
        md.update(unsignedBytes(clientExponent))
        md.update(unsignedBytes(serverModulus))
        md.update(unsignedBytes(serverExponent))
        md.update(byteArrayOf(c.substring(2, 4).toInt(16).toByte(), c.substring(4, 6).toInt(16).toByte()))
        val hash = md.digest()
        return if ((hash[0].toInt() and 0xFF) == c.substring(0, 2).toInt(16)) hash else null
    }
}

object RemoteMessages {
    const val PORT = 6466

    /** Funciones anunciadas a la TV: ping, teclas, IME, encendido, volumen y abrir apps. */
    const val FEATURES = 622

    const val DIRECTION_START_LONG = 1
    const val DIRECTION_END_LONG = 2
    const val DIRECTION_SHORT = 3

    const val FIELD_CONFIGURE = 1
    const val FIELD_SET_ACTIVE = 2
    const val FIELD_ERROR = 3
    const val FIELD_PING_REQUEST = 8
    const val FIELD_IME_KEY_INJECT = 20
    const val FIELD_IME_BATCH_EDIT = 21
    const val FIELD_IME_SHOW_REQUEST = 22
    const val FIELD_START = 40
    const val FIELD_VOLUME = 50

    fun configure(model: String, vendor: String) = ProtoWriter().message(1) {
        int(1, FEATURES)
        message(2) {
            string(1, model)
            string(2, vendor)
            int(3, 1)
            string(4, "1")
            string(5, "atvremote")
            string(6, "1.0.0")
        }
    }.toByteArray()

    fun setActive() = ProtoWriter().message(2) { int(1, FEATURES) }.toByteArray()

    fun pingResponse(value: Int) = ProtoWriter().message(9) { int(1, value) }.toByteArray()

    fun key(keyCode: Int, direction: Int = DIRECTION_SHORT) =
        ProtoWriter().message(10) { int(1, keyCode); int(2, direction) }.toByteArray()

    fun appLink(link: String) = ProtoWriter().message(90) { string(1, link) }.toByteArray()

    /**
     * Sustituye el texto del campo que tiene el foco en la TV. Los contadores son los últimos
     * que envió la TV en su propio remote_ime_batch_edit.
     */
    fun imeText(imeCounter: Int, fieldCounter: Int, text: String) = ProtoWriter().message(FIELD_IME_BATCH_EDIT) {
        int(1, imeCounter)
        int(2, fieldCounter)
        message(3) {
            int(1, 1)
            message(2) {
                int(1, text.length - 1)
                int(2, text.length - 1)
                string(3, text)
            }
        }
    }.toByteArray()
}

/** Códigos de tecla de Android (KeyEvent.KEYCODE_*), que son los que entiende la TV. */
object Keys {
    const val HOME = 3
    const val BACK = 4
    const val DPAD_UP = 19
    const val DPAD_DOWN = 20
    const val DPAD_LEFT = 21
    const val DPAD_RIGHT = 22
    const val DPAD_CENTER = 23
    const val VOLUME_UP = 24
    const val VOLUME_DOWN = 25
    const val POWER = 26
    const val MENU = 82
    const val ENTER = 66
    const val DEL = 67
    const val MEDIA_PLAY_PAUSE = 85
    const val MEDIA_NEXT = 87
    const val MEDIA_PREVIOUS = 88
    const val MEDIA_REWIND = 89
    const val MEDIA_FAST_FORWARD = 90
    const val MEDIA_PLAY = 126
    const val MEDIA_PAUSE = 127
    const val MUTE = 164
    const val INFO = 165
    const val CHANNEL_UP = 166
    const val CHANNEL_DOWN = 167
    const val GUIDE = 172
    const val SETTINGS = 176
    const val TV_INPUT = 178
    const val SLEEP = 223
    const val WAKEUP = 224

    /** Teclas que se pueden elegir al crear una escena. */
    val catalog: List<Pair<String, Int>> = listOf(
        "Inicio" to HOME,
        "Atrás" to BACK,
        "Arriba" to DPAD_UP,
        "Abajo" to DPAD_DOWN,
        "Izquierda" to DPAD_LEFT,
        "Derecha" to DPAD_RIGHT,
        "OK" to DPAD_CENTER,
        "Subir volumen" to VOLUME_UP,
        "Bajar volumen" to VOLUME_DOWN,
        "Silencio" to MUTE,
        "Canal +" to CHANNEL_UP,
        "Canal −" to CHANNEL_DOWN,
        "Entrada / fuente" to TV_INPUT,
        "Ajustes" to SETTINGS,
        "Menú" to MENU,
        "Guía" to GUIDE,
        "Info" to INFO,
        "Play / pausa" to MEDIA_PLAY_PAUSE,
        "Retroceder" to MEDIA_REWIND,
        "Avanzar" to MEDIA_FAST_FORWARD,
        "Encender/apagar (alternar)" to POWER,
    ) + (0..9).map { "Número $it" to (7 + it) }

    fun label(code: Int) = catalog.firstOrNull { it.second == code }?.first ?: "Tecla $code"
}

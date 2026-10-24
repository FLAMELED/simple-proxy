package com.mdl.tclremote.atv

import java.io.ByteArrayOutputStream
import java.io.EOFException
import java.io.InputStream
import java.io.OutputStream

/** Codificador protobuf mínimo: solo lo que necesitan los mensajes del mando de Google TV. */
class ProtoWriter {
    private val out = ByteArrayOutputStream()

    fun int(field: Int, value: Int) = varint(field, value.toLong())

    fun bool(field: Int, value: Boolean) = varint(field, if (value) 1 else 0)

    fun varint(field: Int, value: Long) = apply {
        writeVarint(out, ((field shl 3) or 0).toLong())
        writeVarint(out, value)
    }

    fun bytes(field: Int, value: ByteArray) = apply {
        writeVarint(out, ((field shl 3) or 2).toLong())
        writeVarint(out, value.size.toLong())
        out.write(value)
    }

    fun string(field: Int, value: String) = bytes(field, value.toByteArray(Charsets.UTF_8))

    fun message(field: Int, block: ProtoWriter.() -> Unit) =
        bytes(field, ProtoWriter().apply(block).toByteArray())

    fun toByteArray(): ByteArray = out.toByteArray()

    companion object {
        fun writeVarint(out: OutputStream, value: Long) {
            var v = value
            while (true) {
                if (v and 0x7FL.inv() == 0L) {
                    out.write(v.toInt())
                    return
                }
                out.write(((v and 0x7F) or 0x80).toInt())
                v = v ushr 7
            }
        }
    }
}

/** Mensaje protobuf decodificado como mapa campo -> valores (Long para varint, ByteArray para bytes). */
class ProtoMessage private constructor(private val fields: Map<Int, List<Any>>) {
    fun has(field: Int) = fields.containsKey(field)
    fun long(field: Int): Long? = fields[field]?.firstOrNull() as? Long
    fun int(field: Int): Int? = long(field)?.toInt()
    fun bool(field: Int): Boolean? = long(field)?.let { it != 0L }
    fun bytes(field: Int): ByteArray? = fields[field]?.firstOrNull() as? ByteArray
    fun string(field: Int): String? = bytes(field)?.toString(Charsets.UTF_8)
    fun message(field: Int): ProtoMessage? = bytes(field)?.let { parse(it) }

    override fun toString() = fields.keys.sorted().joinToString(prefix = "Proto(", postfix = ")")

    companion object {
        fun parse(data: ByteArray): ProtoMessage {
            val fields = mutableMapOf<Int, MutableList<Any>>()
            var pos = 0
            fun readVarint(): Long {
                var result = 0L
                var shift = 0
                while (true) {
                    if (pos >= data.size) throw ProtoException("varint truncado")
                    val b = data[pos++].toInt() and 0xFF
                    result = result or ((b and 0x7F).toLong() shl shift)
                    if (b and 0x80 == 0) return result
                    shift += 7
                    if (shift > 63) throw ProtoException("varint demasiado largo")
                }
            }
            while (pos < data.size) {
                val tag = readVarint()
                val field = (tag ushr 3).toInt()
                val value: Any = when ((tag and 7).toInt()) {
                    0 -> readVarint()
                    1 -> { pos += 8; continue }
                    2 -> {
                        val len = readVarint().toInt()
                        if (len < 0 || pos + len > data.size) throw ProtoException("longitud inválida")
                        data.copyOfRange(pos, pos + len).also { pos += len }
                    }
                    5 -> { pos += 4; continue }
                    else -> throw ProtoException("tipo de campo no soportado")
                }
                fields.getOrPut(field) { mutableListOf() }.add(value)
            }
            return ProtoMessage(fields)
        }
    }
}

class ProtoException(message: String) : Exception(message)

/** Cada mensaje en el socket va precedido de su longitud como varint. */
object Framing {
    fun write(out: OutputStream, payload: ByteArray) {
        val buf = ByteArrayOutputStream(payload.size + 5)
        ProtoWriter.writeVarint(buf, payload.size.toLong())
        buf.write(payload)
        out.write(buf.toByteArray())
        out.flush()
    }

    fun read(input: InputStream): ByteArray {
        var len = 0
        var shift = 0
        while (true) {
            val b = input.read()
            if (b < 0) throw EOFException("La TV cerró la conexión")
            len = len or ((b and 0x7F) shl shift)
            if (b and 0x80 == 0) break
            shift += 7
            if (shift > 28) throw ProtoException("longitud de trama inválida")
        }
        val data = ByteArray(len)
        var read = 0
        while (read < len) {
            val n = input.read(data, read, len - read)
            if (n < 0) throw EOFException("La TV cerró la conexión")
            read += n
        }
        return data
    }
}

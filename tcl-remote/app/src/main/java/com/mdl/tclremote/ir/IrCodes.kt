package com.mdl.tclremote.ir

import kotlin.math.roundToInt

class IrSignal(val frequency: Int, val pattern: IntArray)

/** Genera patrones de pulsos (microsegundos, empezando por "encendido") para ConsumerIrManager. */
object IrCodes {
    fun nec(address: Int, command: Int): IrSignal {
        val p = mutableListOf(9000, 4500)
        val addr = if (address > 0xFF) address else (address and 0xFF) or ((address.inv() and 0xFF) shl 8)
        val bits = (addr and 0xFFFF).toLong() or
            ((command and 0xFF).toLong() shl 16) or
            ((command.inv() and 0xFF).toLong() shl 24)
        for (i in 0 until 32) {
            p += 560
            p += if ((bits shr i) and 1L == 1L) 1690 else 560
        }
        p += 560
        return IrSignal(38000, p.toIntArray())
    }

    /** Protocolo RCA (56 kHz), el que usan muchos televisores TCL. */
    fun rca(address: Int, command: Int): IrSignal {
        val frame = mutableListOf(4000, 4000)
        val value = ((address and 0xF) shl 20) or ((command and 0xFF) shl 12) or
            ((address.inv() and 0xF) shl 8) or (command.inv() and 0xFF)
        for (i in 23 downTo 0) {
            frame += 500
            frame += if ((value shr i) and 1 == 1) 2000 else 1000
        }
        frame += 500
        val p = frame.toMutableList()
        p += 8000
        p += frame
        return IrSignal(56000, p.toIntArray())
    }

    /** Código Pronto hexadecimal ("0000 006D 0022 0002 ..."), el formato habitual de las bases de datos IR. */
    fun pronto(code: String): IrSignal {
        val words = code.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.map { it.toInt(16) }
        require(words.size >= 6 && words[0] == 0) { "Código Pronto no válido" }
        val frequency = (1_000_000.0 / (words[1] * 0.241246)).roundToInt()
        val once = words[2]
        val repeat = words[3]
        val body = words.drop(4)
        require(body.size >= 2 * (once + repeat)) { "Código Pronto incompleto" }
        val pairs = if (once > 0) body.take(2 * once) else body.drop(2 * once).take(2 * repeat)
        val period = 1_000_000.0 / frequency
        return IrSignal(frequency, pairs.map { (it * period).roundToInt().coerceAtLeast(1) }.toIntArray())
    }

    /** Códigos de encendido candidatos para TV TCL. Se prueban desde Ajustes. */
    val powerCandidates: List<Pair<String, () -> IrSignal>> = listOf(
        "TCL RCA (F/54)" to { rca(0xF, 0x54) },
        "TCL RCA (F/D5)" to { rca(0xF, 0xD5) },
        "TCL NEC (04/08)" to { nec(0x04, 0x08) },
        "TCL NEC (00/12)" to { nec(0x00, 0x12) },
    )
}

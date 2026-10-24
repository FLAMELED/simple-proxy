package com.mdl.tclremote.ir

import android.content.Context
import android.hardware.ConsumerIrManager
import com.mdl.tclremote.data.Store

object IrSender {
    private const val CANDIDATE_PREFIX = "candidate:"

    fun hasEmitter(context: Context) =
        context.getSystemService(ConsumerIrManager::class.java)?.hasIrEmitter() == true

    fun send(context: Context, signal: IrSignal) {
        val ir = context.getSystemService(ConsumerIrManager::class.java)
            ?: throw IllegalStateException("Este teléfono no tiene emisor de infrarrojos")
        ir.transmit(signal.frequency, signal.pattern)
    }

    fun candidateCode(index: Int) = "$CANDIDATE_PREFIX$index"

    /** Convierte lo guardado en ajustes en una señal; null si no hay código configurado. */
    fun signalFor(code: String): IrSignal? = when {
        code.isBlank() -> null
        code.startsWith(CANDIDATE_PREFIX) ->
            IrCodes.powerCandidates.getOrNull(code.removePrefix(CANDIDATE_PREFIX).toIntOrNull() ?: -1)?.second?.invoke()
        else -> runCatching { IrCodes.pronto(code) }.getOrNull()
    }

    fun isConfigured() = signalFor(Store.irCode.value) != null

    /** Envía el código de encendido configurado. Devuelve false si no hay ninguno. */
    fun sendPower(context: Context): Boolean {
        val signal = signalFor(Store.irCode.value) ?: return false
        if (!hasEmitter(context)) return false
        send(context, signal)
        return true
    }
}

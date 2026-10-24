package com.mdl.tclremote.atv

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Registro en memoria de la conexión con la TV, visible en Ajustes para diagnosticar fallos. */
object DebugLog {
    private const val MAX_LINES = 80
    private val format = SimpleDateFormat("HH:mm:ss.SSS", Locale.ROOT)

    private val _lines = MutableStateFlow<List<String>>(emptyList())
    val lines: StateFlow<List<String>> = _lines

    fun log(message: String) {
        val line = "${format.format(Date())}  $message"
        _lines.update { (it + line).takeLast(MAX_LINES) }
    }

    fun error(step: String, e: Throwable) {
        log("✗ $step: ${e.javaClass.simpleName}: ${e.message}")
        e.cause?.let { log("   causa: ${it.javaClass.simpleName}: ${it.message}") }
    }

    fun clear() {
        _lines.value = emptyList()
    }
}

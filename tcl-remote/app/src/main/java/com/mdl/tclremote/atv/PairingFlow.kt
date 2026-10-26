package com.mdl.tclremote.atv

import android.os.Build
import com.mdl.tclremote.data.Store
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface PairingState {
    data object Idle : PairingState
    data object Starting : PairingState
    data class WaitingCode(val deviceName: String?, val error: String? = null) : PairingState
    data class Checking(val deviceName: String?) : PairingState
    data object Done : PairingState
    data class Failed(val message: String) : PairingState
}

/** Vinculación con la TV como máquina de estados, compartida por el asistente de inicio y Ajustes. */
object PairingFlow {
    private val _state = MutableStateFlow<PairingState>(PairingState.Idle)
    val state: StateFlow<PairingState> = _state
    private var session: PairingSession? = null

    fun start(host: String) {
        cancel()
        val h = host.trim()
        Store.setHost(h)
        TvRemote.disconnect()
        DebugLog.clear()
        _state.value = PairingState.Starting
        TvRemote.scope.launch {
            val s = PairingSession(h)
            try {
                s.start(Build.MODEL)
                session = s
                _state.value = PairingState.WaitingCode(s.serverName)
            } catch (e: Exception) {
                s.close()
                _state.value = PairingState.Failed(
                    "La TV no aceptó la conexión. Comprueba que está encendida y que la IP es la de la TCL.",
                )
            }
        }
    }

    fun submit(code: String) {
        val s = session ?: return
        val waiting = _state.value as? PairingState.WaitingCode ?: return
        _state.value = PairingState.Checking(waiting.deviceName)
        TvRemote.scope.launch {
            try {
                if (s.finish(code)) {
                    session = null
                    Store.setPaired(true)
                    _state.value = PairingState.Done
                    runCatching { TvRemote.connection() }
                } else {
                    _state.value = waiting.copy(error = "Ese código no coincide. Revísalo en la pantalla de la TV.")
                }
            } catch (e: Exception) {
                s.close()
                session = null
                _state.value = PairingState.Failed("La vinculación se cortó. Vuelve a intentarlo.")
            }
        }
    }

    fun cancel() {
        session?.close()
        session = null
        _state.value = PairingState.Idle
    }

    /** Vuelve a Idle tras mostrar el resultado (éxito o error). */
    fun acknowledge() {
        if (_state.value is PairingState.Done || _state.value is PairingState.Failed) _state.value = PairingState.Idle
    }
}

package com.mdl.tclremote.atv

import android.content.Context
import com.mdl.tclremote.data.Scene
import com.mdl.tclremote.data.Step
import com.mdl.tclremote.data.StepType
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ir.IrSender
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.runInterruptible
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLException

enum class Link { NOT_CONFIGURED, DISCONNECTED, CONNECTING, CONNECTED }

data class TvState(
    val link: Link = Link.DISCONNECTED,
    val power: Boolean? = null,
    val volume: Int? = null,
    val maxVolume: Int? = null,
    val muted: Boolean = false,
    val error: String? = null,
    /** Paquete de la app que está en primer plano en la TV, si la TV lo ha dicho. */
    val currentApp: String? = null,
    /** La TV tiene un campo de texto abierto (por ejemplo, un buscador). */
    val imeRequested: Boolean = false,
)

/** Punto único de acceso a la TV: lo usan la interfaz, el widget y los horarios. */
object TvRemote : TvConnection.Listener {
    private const val IDLE_CLOSE_MS = 60_000L

    private val _state = MutableStateFlow(TvState())
    val state: StateFlow<TvState> = _state
    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val messages: SharedFlow<String> = _messages

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private var connection: TvConnection? = null
    private var idleJob: Job? = null
    private var reconnectJob: Job? = null

    /** Mientras la app está en pantalla la conexión se mantiene abierta y se recupera sola si se corta. */
    @Volatile var keepAlive = false
        set(value) {
            field = value
            touch()
            if (value) autoConnect()
        }

    /** Conecta en segundo plano y reintenta con esperas crecientes, sin mostrar errores en pantalla. */
    fun autoConnect() {
        if (reconnectJob?.isActive == true) return
        reconnectJob = scope.launch {
            var wait = 1500L
            while (keepAlive && Store.host.value.isNotBlank() && Store.paired.value) {
                if (runCatching { connection() }.isSuccess) return@launch
                delay(wait)
                wait = (wait * 2).coerceAtMost(20_000L)
            }
        }
    }

    suspend fun connection(): TvConnection {
        val c = mutex.withLock {
            connection?.takeIf { it.isOpen } ?: run {
                val host = Store.host.value
                if (host.isBlank()) {
                    _state.update { it.copy(link = Link.NOT_CONFIGURED) }
                    throw IllegalStateException("Configura la IP de la TV en Ajustes")
                }
                _state.update { it.copy(link = Link.CONNECTING, error = null) }
                val fresh = TvConnection(host, this)
                try {
                    runInterruptible(Dispatchers.IO) { fresh.open() }
                } catch (e: Exception) {
                    val msg = friendly(e)
                    _state.update { it.copy(link = Link.DISCONNECTED, error = msg) }
                    throw TvException(msg, e)
                }
                connection = fresh
                _state.update { it.copy(link = Link.CONNECTED, error = null, power = fresh.power ?: it.power) }
                fresh
            }
        }
        touch()
        return c
    }

    private fun touch() {
        idleJob?.cancel()
        if (keepAlive) return
        idleJob = scope.launch {
            delay(IDLE_CLOSE_MS)
            disconnect()
        }
    }

    fun disconnect() {
        connection?.close()
        connection = null
        _state.update { it.copy(link = Link.DISCONNECTED) }
    }

    suspend fun key(code: Int) = connection().key(code)

    suspend fun openApp(link: String) = connection().openApp(link)

    /** Escribe [text] en el campo de texto que tiene el foco en la TV (sustituye su contenido). */
    suspend fun sendText(text: String) = connection().sendText(text)

    fun dismissImeRequest() = _state.update { it.copy(imeRequested = false) }

    /** Enciende sin arriesgarse a apagar: usa el estado que informa la TV y, si no responde, el infrarrojo. */
    suspend fun powerOn(context: Context) {
        val c = runCatching { connection() }.getOrNull()
        if (c != null) {
            when (runInterruptible(Dispatchers.IO) { c.awaitPower(1500) }) {
                true -> Unit
                false -> c.key(Keys.POWER)
                null -> c.key(Keys.WAKEUP)
            }
            return
        }
        if (!IrSender.sendPower(context)) {
            throw TvException(
                "No se pudo conectar con la TV. Si está totalmente apagada, configura el infrarrojo en Ajustes " +
                    "o activa en la TV la opción de mantener la red encendida en reposo.",
            )
        }
        // La TV tarda unos segundos en arrancar la red tras encenderse por infrarrojo.
        repeat(10) {
            delay(2000)
            if (runCatching { connection() }.isSuccess) return
        }
    }

    suspend fun powerOff() {
        val c = connection()
        when (runInterruptible(Dispatchers.IO) { c.awaitPower(1500) }) {
            true -> c.key(Keys.POWER)
            false -> Unit
            null -> c.key(Keys.SLEEP)
        }
    }

    suspend fun togglePower(context: Context) {
        val c = runCatching { connection() }.getOrNull()
        if (c == null) {
            if (!IrSender.sendPower(context)) throw TvException(_state.value.error ?: "Sin conexión con la TV")
            return
        }
        c.key(Keys.POWER)
    }

    suspend fun runScene(context: Context, scene: Scene) {
        for (step in scene.steps) {
            runStep(context, step)
            delay(250)
        }
    }

    private suspend fun runStep(context: Context, step: Step) {
        when (step.type) {
            StepType.POWER_ON -> powerOn(context)
            StepType.POWER_OFF -> powerOff()
            StepType.IR_POWER -> if (!IrSender.sendPower(context)) throw TvException("No hay código infrarrojo configurado")
            StepType.DELAY -> delay(((step.value.toDoubleOrNull() ?: 1.0) * 1000).toLong())
            StepType.APP -> openApp(step.value)
            StepType.KEY -> repeat(step.count.coerceAtLeast(1)) {
                key(step.value.toInt())
                delay(180)
            }
        }
    }

    /** Lanza una acción desde la interfaz y muestra el error si falla. */
    fun launch(block: suspend () -> Unit) {
        scope.launch {
            try {
                block()
            } catch (e: Exception) {
                _messages.tryEmit(e.message ?: "Error")
            }
        }
    }

    fun notify(message: String) {
        _messages.tryEmit(message)
    }

    override fun onPower(on: Boolean) = _state.update { it.copy(power = on) }

    override fun onVolume(level: Int, max: Int, muted: Boolean) =
        _state.update { it.copy(volume = level, maxVolume = max, muted = muted) }

    override fun onCurrentApp(packageName: String) =
        _state.update { it.copy(currentApp = packageName, imeRequested = false) }

    override fun onImeRequest() = _state.update { it.copy(imeRequested = true) }

    override fun onClosed(connection: TvConnection, error: Throwable?) {
        if (this.connection === connection) {
            this.connection = null
            _state.update { it.copy(link = Link.DISCONNECTED) }
            if (keepAlive) autoConnect()
        }
    }

    private fun friendly(e: Exception): String = when (e) {
        is SSLException -> "La TV no reconoce este móvil. Vuelve a vincularlo en Ajustes."
        is ConnectException, is NoRouteToHostException, is SocketTimeoutException ->
            "La TV no responde. Puede estar apagada del todo o en otra WiFi."
        else -> e.message ?: e.javaClass.simpleName
    }
}

class TvException(message: String, cause: Throwable? = null) : Exception(message, cause)

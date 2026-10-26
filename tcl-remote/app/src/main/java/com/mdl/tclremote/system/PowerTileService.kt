package com.mdl.tclremote.system

import android.graphics.drawable.Icon
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.widget.Toast
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Link
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

/** Botón de Ajustes rápidos: enciende o apaga la TV desde la cortina de notificaciones. */
class PowerTileService : TileService() {
    private var watch: Job? = null

    override fun onStartListening() {
        super.onStartListening()
        Store.init(applicationContext)
        render()
        watch = TvRemote.scope.launch {
            TvRemote.state.collect { withContext(Dispatchers.Main) { render() } }
        }
    }

    override fun onStopListening() {
        watch?.cancel()
        watch = null
        super.onStopListening()
    }

    override fun onClick() {
        super.onClick()
        val app = applicationContext
        TvRemote.scope.launch {
            try {
                withTimeout(12_000) { TvRemote.togglePower(app) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(app, e.message ?: "Sin conexión con la TV", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun render() {
        val tile = qsTile ?: return
        val state = TvRemote.state.value
        val on = state.link == Link.CONNECTED && state.power == true
        tile.label = "TV TCL"
        tile.icon = Icon.createWithResource(this, R.drawable.ic_power)
        tile.state = when {
            state.link != Link.CONNECTED || state.power == null -> Tile.STATE_INACTIVE
            on -> Tile.STATE_ACTIVE
            else -> Tile.STATE_INACTIVE
        }
        tile.subtitle = when {
            state.link != Link.CONNECTED -> "Toca para encender/apagar"
            on -> "Encendida"
            else -> "En reposo"
        }
        tile.updateTile()
    }
}

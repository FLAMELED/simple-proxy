package com.mdl.tclremote.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.Link
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store

private fun send(code: Int) = TvRemote.launch { TvRemote.key(code) }

@Composable
fun RemoteScreen(onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    val state by TvRemote.state.collectAsState()
    val host by Store.host.collectAsState()
    val apps by Store.apps.collectAsState()
    val scenes by Store.scenes.collectAsState()
    var ordering by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Estado de la conexión
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("TCL 65C6K", style = MaterialTheme.typography.headlineSmall)
                val (dot, label) = when {
                    host.isBlank() -> Color.Gray to "Sin configurar"
                    state.link == Link.CONNECTED && state.power == false -> Color(0xFFFFB224) to "Conectada · en reposo"
                    state.link == Link.CONNECTED -> Color(0xFF46A758) to buildString {
                        append("Conectada")
                        state.volume?.let { append(" · volumen $it") }
                        if (state.muted) append(" · silencio")
                    }
                    state.link == Link.CONNECTING -> Color(0xFF8E9BFF) to "Conectando…"
                    else -> Accent to (state.error ?: "Desconectada")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).background(dot, CircleShape))
                    Spacer(Modifier.width(6.dp))
                    Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                }
            }
            if (host.isBlank()) {
                TextButton(onClick = onOpenSettings) { Text("Configurar") }
            } else if (state.link != Link.CONNECTED) {
                IconButton(onClick = { TvRemote.launch { TvRemote.connection() } }) {
                    Icon(Icons.Default.Refresh, "Reconectar")
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            RemoteButton(
                onPress = { TvRemote.launch { TvRemote.togglePower(context) } },
                modifier = Modifier.size(64.dp),
                color = Accent,
            ) { Icon(painterResource(R.drawable.ic_power), "Encender / apagar", tint = Color.White) }
            IconKey(painterIcon = R.drawable.ic_input, description = "Entrada", code = Keys.TV_INPUT)
            IconKey(Icons.Default.Settings, "Ajustes", Keys.SETTINGS)
            IconKey(Icons.Default.Menu, "Menú", Keys.MENU)
        }

        Spacer(Modifier.height(24.dp))
        DPad()
        Spacer(Modifier.height(24.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            IconKey(Icons.AutoMirrored.Filled.ArrowBack, "Atrás", Keys.BACK)
            IconKey(Icons.Default.Home, "Inicio", Keys.HOME)
            IconKey(Icons.Default.PlayArrow, "Play / pausa", Keys.MEDIA_PLAY_PAUSE)
        }

        Spacer(Modifier.height(20.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Rocker("VOL", Keys.VOLUME_UP, Keys.VOLUME_DOWN, upIcon = R.drawable.ic_vol_up, downIcon = R.drawable.ic_vol_down)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                IconKey(painterIcon = R.drawable.ic_mute, description = "Silencio", code = Keys.MUTE)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TextKey("⏪", Keys.MEDIA_REWIND)
                    TextKey("⏩", Keys.MEDIA_FAST_FORWARD)
                }
            }
            Rocker("CH", Keys.CHANNEL_UP, Keys.CHANNEL_DOWN)
        }

        Spacer(Modifier.height(24.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Apps", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            TextButton(onClick = { ordering = !ordering }) { Text(if (ordering) "Listo" else "Ordenar") }
        }
        if (ordering) {
            Text(
                "Toca una app y luego el lugar al que quieres moverla.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.height(10.dp))
        AppGrid(apps, onOpen = { app -> TvRemote.launch { TvRemote.openApp(app.link) } }, ordering = ordering)
        if (scenes.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text("Escenas", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                scenes.forEach { scene ->
                    AssistChip(
                        onClick = {
                            TvRemote.notify("Ejecutando “${scene.name}”")
                            TvRemote.launch { TvRemote.runScene(context, scene) }
                        },
                        label = { Text(scene.name) },
                    )
                }
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun IconKey(icon: ImageVector? = null, description: String, code: Int, painterIcon: Int? = null) {
    RemoteButton(onPress = { send(code) }, modifier = Modifier.size(56.dp)) {
        if (painterIcon != null) Icon(painterResource(painterIcon), description)
        else if (icon != null) Icon(icon, description)
    }
}

@Composable
private fun TextKey(label: String, code: Int) {
    RemoteButton(onPress = { send(code) }, modifier = Modifier.size(44.dp), repeat = true) {
        Text(label, fontSize = 16.sp)
    }
}

@Composable
private fun Rocker(label: String, up: Int, down: Int, upIcon: Int? = null, downIcon: Int? = null) {
    Column(
        Modifier
            .width(64.dp)
            .background(MaterialTheme.colorScheme.surfaceContainerHighest, RoundedCornerShape(32.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val shape = RoundedCornerShape(32.dp)
        val color = MaterialTheme.colorScheme.surfaceContainerHighest
        RemoteButton(onPress = { send(up) }, modifier = Modifier.size(64.dp), shape = shape, color = color, repeat = true) {
            if (upIcon != null) Icon(painterResource(upIcon), "$label +") else Icon(Icons.Default.KeyboardArrowUp, "$label +")
        }
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        RemoteButton(onPress = { send(down) }, modifier = Modifier.size(64.dp), shape = shape, color = color, repeat = true) {
            if (downIcon != null) Icon(painterResource(downIcon), "$label −") else Icon(Icons.Default.KeyboardArrowDown, "$label −")
        }
    }
}

@Composable
private fun DPad() {
    val ring = MaterialTheme.colorScheme.surfaceContainerHighest
    Box(Modifier.size(250.dp).background(ring, CircleShape), contentAlignment = Alignment.Center) {
        val arrow = Modifier.size(80.dp)
        Box(Modifier.align(Alignment.TopCenter)) {
            RemoteButton({ send(Keys.DPAD_UP) }, arrow, color = ring, repeat = true) { Icon(Icons.Default.KeyboardArrowUp, "Arriba", Modifier.size(36.dp)) }
        }
        Box(Modifier.align(Alignment.BottomCenter)) {
            RemoteButton({ send(Keys.DPAD_DOWN) }, arrow, color = ring, repeat = true) { Icon(Icons.Default.KeyboardArrowDown, "Abajo", Modifier.size(36.dp)) }
        }
        Box(Modifier.align(Alignment.CenterStart)) {
            RemoteButton({ send(Keys.DPAD_LEFT) }, arrow, color = ring, repeat = true) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Izquierda", Modifier.size(36.dp)) }
        }
        Box(Modifier.align(Alignment.CenterEnd)) {
            RemoteButton({ send(Keys.DPAD_RIGHT) }, arrow, color = ring, repeat = true) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Derecha", Modifier.size(36.dp)) }
        }
        RemoteButton({ send(Keys.DPAD_CENTER) }, Modifier.size(96.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh) {
            Text("OK", style = MaterialTheme.typography.titleLarge)
        }
    }
}

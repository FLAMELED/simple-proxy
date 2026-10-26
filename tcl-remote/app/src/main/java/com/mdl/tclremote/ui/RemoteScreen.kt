package com.mdl.tclremote.ui

import android.view.HapticFeedbackConstants
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.Link
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.work.SleepTimer
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.drop
import kotlin.math.abs
import kotlin.math.roundToInt

private fun send(code: Int) = TvRemote.press(code)

@Composable
fun RemoteScreen(onOpenSettings: () -> Unit, onOpenApps: () -> Unit) {
    val context = LocalContext.current
    val state by TvRemote.state.collectAsState()
    val host by Store.host.collectAsState()
    val scenes by Store.scenes.collectAsState()
    val touchpad by Store.touchpad.value.collectAsState()
    var keyboard by remember { mutableStateOf(false) }
    var more by remember { mutableStateOf(false) }
    var sleep by remember { mutableStateOf(false) }
    val on = state.link == Link.CONNECTED && state.power != false

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Header(host.isBlank(), onOpenSettings, onSleep = { sleep = true }, onMore = { more = true })

        AnimatedVisibility(state.imeRequested) {
            Row(
                Modifier.fillMaxWidth().padding(top = 10.dp)
                    .background(Accent.copy(alpha = 0.18f), RoundedCornerShape(16.dp))
                    .clickable { keyboard = true }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(R.drawable.ic_keyboard), null, tint = Accent)
                Spacer(Modifier.width(10.dp))
                Text("La TV está esperando texto", Modifier.weight(1f))
                Text("Escribir", color = Accent, style = MaterialTheme.typography.labelLarge)
            }
        }

        Spacer(Modifier.height(18.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            RemoteButton(
                onPress = { TvRemote.launch { TvRemote.togglePower(context) } },
                modifier = Modifier.size(60.dp),
                color = if (on) Accent else MaterialTheme.colorScheme.surfaceContainerHighest,
            ) {
                Icon(painterResource(R.drawable.ic_power), "Encender o apagar", tint = if (on) Color.White else Accent)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                IconKey(R.drawable.ic_input, "Entrada", Keys.TV_INPUT)
                IconKey(R.drawable.ic_settings_tv, "Ajustes de la TV", Keys.SETTINGS)
            }
        }

        Spacer(Modifier.height(16.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = !touchpad,
                onClick = { Store.touchpad.set(false) },
                label = { Text("Cruceta") },
                leadingIcon = { Icon(painterResource(R.drawable.ic_dpad), null, Modifier.size(18.dp)) },
            )
            FilterChip(
                selected = touchpad,
                onClick = { Store.touchpad.set(true) },
                label = { Text("Touchpad") },
                leadingIcon = { Icon(painterResource(R.drawable.ic_touchpad), null, Modifier.size(18.dp)) },
            )
        }

        Spacer(Modifier.height(14.dp))
        Crossfade(touchpad, label = "pad") { pad -> if (pad) Touchpad() else DPad() }
        Spacer(Modifier.height(18.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            WideKey(R.drawable.ic_back, "Atrás", Keys.BACK, Modifier.weight(1f))
            WideKey(R.drawable.ic_home, "Inicio", Keys.HOME, Modifier.weight(1f))
            IconKey(R.drawable.ic_play_pause, "Play / pausa", Keys.MEDIA_PLAY_PAUSE)
        }

        Spacer(Modifier.height(12.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            VolumeRocker(Modifier.weight(1f))
            IconKey(R.drawable.ic_mute, "Silencio", Keys.MUTE, highlighted = state.muted)
            RemoteButton(onPress = { keyboard = true }, modifier = Modifier.size(56.dp)) {
                Icon(painterResource(R.drawable.ic_keyboard), "Teclado")
            }
        }

        val volume = state.volume
        val max = state.maxVolume
        if (volume != null && max != null && max > 0) {
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                LinearProgressIndicator(
                    progress = { volume / max.toFloat() },
                    modifier = Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(3.dp)),
                    color = if (state.muted) MaterialTheme.colorScheme.onSurfaceVariant else Accent,
                    trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                )
                Text(
                    if (state.muted) "  Silencio" else "  $volume",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(22.dp))
        Favorites(onOpenApps)

        if (scenes.isNotEmpty()) {
            Spacer(Modifier.height(14.dp))
            Text("Escenas", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(6.dp))
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

    if (keyboard) KeyboardDialog(onDismiss = { keyboard = false; TvRemote.dismissImeRequest() })
    if (more) MoreDialog(onDismiss = { more = false })
    if (sleep) SleepDialog(onDismiss = { sleep = false })
}

@Composable
private fun Header(notConfigured: Boolean, onOpenSettings: () -> Unit, onSleep: () -> Unit, onMore: () -> Unit) {
    val state by TvRemote.state.collectAsState()
    val sleepAt by Store.sleepAt.collectAsState()
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(sleepAt) {
        while (sleepAt > 0) {
            now = System.currentTimeMillis()
            delay(15_000)
        }
    }

    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("TCL 65C6K", style = MaterialTheme.typography.headlineSmall)
            val (dot, label) = when {
                notConfigured -> Color.Gray to "Sin configurar"
                state.link == Link.CONNECTED && state.power == false -> Color(0xFFFFB224) to "En reposo"
                state.link == Link.CONNECTED -> Color(0xFF46A758) to "Conectada"
                state.link == Link.CONNECTING -> Color(0xFF8E9BFF) to "Conectando…"
                else -> Accent to (state.error ?: "Buscando la TV…")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).background(dot, CircleShape))
                Spacer(Modifier.width(6.dp))
                Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
            }
            val app = state.currentApp?.takeIf { state.link == Link.CONNECTED && state.power != false }?.let(::appForPackage)
            AnimatedVisibility(app != null) {
                if (app != null) {
                    Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        AppIcon(app, 20)
                        Spacer(Modifier.width(6.dp))
                        Text("En la TV: ${app.name}", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
            if (sleepAt > now) {
                val minutes = ((sleepAt - now) / 60_000.0).roundToInt().coerceAtLeast(1)
                Text(
                    "Se apaga en $minutes min",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(top = 4.dp).clickable(onClick = onSleep),
                )
            }
        }
        if (notConfigured) {
            TextButton(onClick = onOpenSettings) { Text("Configurar") }
        } else {
            IconButton(onClick = onSleep) { Icon(painterResource(R.drawable.ic_bedtime), "Temporizador de apagado") }
            IconButton(onClick = onMore) { Icon(painterResource(R.drawable.ic_more), "Más botones") }
        }
    }
}

@Composable
private fun Favorites(onOpenApps: () -> Unit) {
    val apps by Store.apps.collectAsState()
    val favoriteLinks by Store.favorites.collectAsState()
    val favorites = apps.filter { it.link in favoriteLinks }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text("Favoritas", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
        TextButton(onClick = onOpenApps) { Text("Todas las apps") }
    }
    if (favorites.isEmpty()) {
        Text(
            "Mantén pulsada una app en la pestaña Apps para añadirla aquí.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
        )
    } else {
        AppGrid(favorites, onOpen = { app -> TvRemote.launch { TvRemote.openApp(app.link) } }, columns = 5)
    }
}

@Composable
private fun IconKey(icon: Int, description: String, code: Int, highlighted: Boolean = false) {
    RemoteButton(
        onPress = { send(code) },
        modifier = Modifier.size(56.dp),
        color = if (highlighted) Accent.copy(alpha = 0.35f) else MaterialTheme.colorScheme.surfaceContainerHighest,
    ) { Icon(painterResource(icon), description) }
}

@Composable
private fun WideKey(icon: Int, label: String, code: Int, modifier: Modifier) {
    RemoteButton(onPress = { send(code) }, modifier = modifier.height(56.dp), shape = RoundedCornerShape(28.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(painterResource(icon), null)
            Spacer(Modifier.width(8.dp))
            Text(label, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun VolumeRocker(modifier: Modifier) {
    val color = MaterialTheme.colorScheme.surfaceContainerHighest
    Row(
        modifier.height(56.dp).background(color, RoundedCornerShape(28.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RemoteButton({ send(Keys.VOLUME_DOWN) }, Modifier.size(56.dp), color = color, repeat = true) {
            Icon(painterResource(R.drawable.ic_vol_down), "Bajar volumen")
        }
        Text(
            "VOL",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f),
        )
        RemoteButton({ send(Keys.VOLUME_UP) }, Modifier.size(56.dp), color = color, repeat = true) {
            Icon(painterResource(R.drawable.ic_vol_up), "Subir volumen")
        }
    }
}

@Composable
private fun DPad() {
    val ring = MaterialTheme.colorScheme.surfaceContainerHighest
    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
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
}

/** Desliza para moverte (cada tramo es una pulsación), toca para OK y mantén pulsado para Atrás. */
@Composable
private fun Touchpad() {
    val view = LocalView.current
    Box(
        Modifier
            .fillMaxWidth()
            .height(250.dp)
            .clip(RoundedCornerShape(32.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                        send(Keys.DPAD_CENTER)
                    },
                    onLongPress = {
                        view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                        send(Keys.BACK)
                    },
                )
            }
            .pointerInput(Unit) {
                val step = 44.dp.toPx()
                var ax = 0f
                var ay = 0f
                detectDragGestures(onDragStart = { ax = 0f; ay = 0f }) { change, drag ->
                    change.consume()
                    ax += drag.x
                    ay += drag.y
                    while (abs(ax) >= step || abs(ay) >= step) {
                        if (abs(ax) > abs(ay)) {
                            send(if (ax > 0) Keys.DPAD_RIGHT else Keys.DPAD_LEFT)
                            ax -= if (ax > 0) step else -step
                            ay = 0f
                        } else {
                            send(if (ay > 0) Keys.DPAD_DOWN else Keys.DPAD_UP)
                            ay -= if (ay > 0) step else -step
                            ax = 0f
                        }
                        view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                    }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(painterResource(R.drawable.ic_touchpad), null, Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text(
                "Desliza para moverte · Toca para OK\nMantén pulsado para Atrás",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** Lo que escribes aparece en el campo de texto que tenga abierto la TV (por ejemplo un buscador). */
@Composable
private fun KeyboardDialog(onDismiss: () -> Unit) {
    var text by remember { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        delay(250)
        runCatching { focus.requestFocus() }
        // drop(1): no borrar lo que ya hubiera en el campo de la TV al abrir el teclado.
        snapshotFlow { text }.drop(1).collectLatest {
            delay(150)
            runCatching { TvRemote.sendText(it) }
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(painterResource(R.drawable.ic_keyboard), null) },
        title = { Text("Escribir en la TV") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Abre un buscador en la TV y escribe aquí: el texto aparece allí al momento.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    singleLine = true,
                    placeholder = { Text("Buscar…") },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { send(Keys.ENTER); onDismiss() }),
                    modifier = Modifier.fillMaxWidth().focusRequester(focus),
                )
            }
        },
        confirmButton = { TextButton(onClick = { send(Keys.ENTER); onDismiss() }) { Text("Buscar") } },
        dismissButton = {
            Row {
                TextButton(onClick = { text = "" }) { Text("Borrar") }
                TextButton(onClick = onDismiss) { Text("Cerrar") }
            }
        },
    )
}

/** Botones que se usan poco: menú, guía, canales, números y control de reproducción. */
@Composable
private fun MoreDialog(onDismiss: () -> Unit) {
    val keys = listOf(
        "Menú" to Keys.MENU, "Guía" to Keys.GUIDE, "Info" to Keys.INFO,
        "Canal +" to Keys.CHANNEL_UP, "Canal −" to Keys.CHANNEL_DOWN, "Entrada" to Keys.TV_INPUT,
        "⏮" to Keys.MEDIA_PREVIOUS, "⏪" to Keys.MEDIA_REWIND, "⏩" to Keys.MEDIA_FAST_FORWARD,
        "⏭" to Keys.MEDIA_NEXT, "▶" to Keys.MEDIA_PLAY, "⏸" to Keys.MEDIA_PAUSE,
    ) + (1..9).map { "$it" to (7 + it) } + listOf("0" to 7)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Más botones") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                keys.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { (label, code) ->
                            RemoteButton(
                                onPress = { send(code) },
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) { Text(label, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cerrar") } },
    )
}

@Composable
private fun SleepDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val sleepAt by Store.sleepAt.collectAsState()
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(painterResource(R.drawable.ic_bedtime), null) },
        title = { Text("Apagar la TV en…") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(15, 30, 45, 60, 90, 120).chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { minutes ->
                            RemoteButton(
                                onPress = {
                                    SleepTimer.start(context, minutes)
                                    TvRemote.notify("La TV se apagará en $minutes minutos")
                                    onDismiss()
                                },
                                modifier = Modifier.weight(1f).height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) { Text(if (minutes < 60) "$minutes min" else "${minutes / 60}${if (minutes % 60 == 30) ",5" else ""} h") }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (sleepAt > 0) {
                TextButton(onClick = {
                    SleepTimer.cancel(context)
                    TvRemote.notify("Temporizador cancelado")
                    onDismiss()
                }) { Text("Cancelar temporizador") }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cerrar") } },
    )
}

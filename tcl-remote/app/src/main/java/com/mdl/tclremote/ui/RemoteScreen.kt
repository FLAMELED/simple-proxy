package com.mdl.tclremote.ui

import android.view.HapticFeedbackConstants
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.PointerEventPass
import com.mdl.tclremote.ir.IrSender
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
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
import com.mdl.tclremote.system.Updates
import com.mdl.tclremote.work.SleepTimer
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch
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

        val update by Updates.available.collectAsState()
        update?.let { info ->
            Row(
                Modifier.fillMaxWidth().padding(top = 10.dp)
                    .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.18f), RoundedCornerShape(16.dp))
                    .clickable { Updates.open(context, info) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Hay una versión nueva (build ${info.build})", Modifier.weight(1f))
                Text("Actualizar", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.labelLarge)
            }
        }

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

        val paired by Store.paired.collectAsState()
        val currentApp = state.currentApp?.takeIf { on && state.link == Link.CONNECTED }?.let(::appForPackage)
        val offline = host.isNotBlank() && paired && state.link == Link.DISCONNECTED && state.error != null
        AnimatedVisibility(currentApp != null && !offline) {
            if (currentApp != null) NowPlaying(currentApp)
        }
        AnimatedVisibility(offline) {
            OfflineCard(state.error.orEmpty(), onOpenSettings)
        }

        Spacer(Modifier.height(14.dp))

        // «Carcasa» del mando: agrupa los controles en una pieza, como un mando físico.
        Column(
            Modifier
                .fillMaxWidth()
                .alpha(if (offline) 0.5f else 1f)
                .clip(RoundedCornerShape(32.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.colorScheme.surfaceContainer),
                    ),
                )
                .padding(14.dp),
        ) {
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

        Spacer(Modifier.height(18.dp))
        Box(Modifier.fillMaxWidth()) {
            Crossfade(touchpad, label = "pad") { pad -> if (pad) Touchpad() else DPad() }
            // Cambiar entre touchpad y cruceta: un botón pequeño en la esquina, sin ocupar una fila.
            IconButton(
                onClick = { Store.touchpad.set(!touchpad) },
                modifier = Modifier.align(Alignment.TopEnd).padding(6.dp)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape),
            ) {
                Icon(
                    painterResource(if (touchpad) R.drawable.ic_dpad else R.drawable.ic_touchpad),
                    if (touchpad) "Usar cruceta" else "Usar touchpad",
                    Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(18.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            WideKey(R.drawable.ic_back, "Atrás", Keys.BACK, Modifier.weight(1f))
            WideKey(R.drawable.ic_home, "Inicio", Keys.HOME, Modifier.weight(1f))
            IconKey(R.drawable.ic_play_pause, "Play / pausa", Keys.MEDIA_PLAY_PAUSE)
        }

        Spacer(Modifier.height(12.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            VolumeBar(state.volume, state.maxVolume, state.muted, Modifier.weight(1f))
            IconKey(R.drawable.ic_mute, "Silencio", Keys.MUTE, highlighted = state.muted)
            RemoteButton(onPress = { keyboard = true }, modifier = Modifier.size(56.dp)) {
                Icon(painterResource(R.drawable.ic_keyboard), "Teclado")
            }
        }

        }

        Spacer(Modifier.height(20.dp))
        Favorites(onOpenApps)

        if (scenes.isNotEmpty()) {
            Spacer(Modifier.height(14.dp))
            Text("Escenas", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                scenes.forEach { scene ->
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                            .clickable {
                                TvRemote.notify("Ejecutando “${scene.name}”")
                                TvRemote.launch { TvRemote.runScene(context, scene) }
                            }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(painterResource(R.drawable.ic_scenes), null, Modifier.size(16.dp), tint = Accent)
                        Spacer(Modifier.width(6.dp))
                        Text(scene.name, style = MaterialTheme.typography.labelLarge)
                    }
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

    val (dot, label) = when {
        notConfigured -> Color.Gray to "Sin configurar"
        state.link == Link.CONNECTED && state.power == false -> Color(0xFFFFB224) to "En reposo"
        state.link == Link.CONNECTED -> Color(0xFF46A758) to "Conectada"
        state.link == Link.CONNECTING -> Color(0xFF8E9BFF) to "Conectando…"
        else -> Accent to "Sin conexión"
    }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f)) {
            // Píldora de estado compacta en lugar de un título grande.
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(9.dp).background(dot, CircleShape))
                Spacer(Modifier.width(8.dp))
                Text("TCL 65C6K", style = MaterialTheme.typography.labelLarge, maxLines = 1)
                Text(
                    " · $label",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (notConfigured) {
            TextButton(onClick = onOpenSettings) { Text("Configurar") }
        } else {
            if (sleepAt > now) {
                val minutes = ((sleepAt - now) / 60_000.0).roundToInt().coerceAtLeast(1)
                Row(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.18f))
                        .clickable(onClick = onSleep)
                        .padding(horizontal = 10.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(painterResource(R.drawable.ic_bedtime), "Temporizador", Modifier.size(16.dp), tint = MaterialTheme.colorScheme.secondary)
                    Spacer(Modifier.width(4.dp))
                    Text("$minutes min", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                }
            } else {
                IconButton(onClick = onSleep) { Icon(painterResource(R.drawable.ic_bedtime), "Temporizador de apagado") }
            }
            IconButton(onClick = onMore) { Icon(painterResource(R.drawable.ic_more), "Más botones") }
        }
    }
}

private data class MediaControl(val icon: Int, val label: String, val key: Int, val repeat: Boolean = false)

/**
 * Controles según el tipo de app abierta. La TV no envía el título ni el progreso del vídeo,
 * así que solo se ofrecen las teclas multimedia que cada app entiende.
 */
private fun mediaControls(app: com.mdl.tclremote.data.AppShortcut): List<MediaControl> {
    val id = (app.name + " " + app.link).lowercase()
    val prev = MediaControl(R.drawable.ic_skip_previous, "Anterior", Keys.MEDIA_PREVIOUS)
    val next = MediaControl(R.drawable.ic_skip_next, "Siguiente", Keys.MEDIA_NEXT)
    val rewind = MediaControl(R.drawable.ic_fast_rewind, "Retroceder", Keys.MEDIA_REWIND, repeat = true)
    val forward = MediaControl(R.drawable.ic_fast_forward, "Avanzar", Keys.MEDIA_FAST_FORWARD, repeat = true)
    val play = MediaControl(R.drawable.ic_play_pause, "Play / pausa", Keys.MEDIA_PLAY_PAUSE)
    val captions = MediaControl(R.drawable.ic_cc, "Subtítulos", Keys.CAPTIONS)
    val music = listOf("spotify", "music", "deezer", "tidal", "amazon music")
    val video = listOf(
        "netflix", "disney", "prime", "max", "hbo", "paramount", "apple", "crunchyroll", "stremio",
        "tubi", "dazn", "espn", "iqiyi", "vix", "pluto", "plex", "kick", "twitch",
    )
    return when {
        music.any { it in id } -> listOf(prev, play, next)
        "youtube" in id -> listOf(prev, rewind, play, forward, next, captions)
        video.any { it in id } -> listOf(rewind, play, forward, captions)
        else -> listOf(rewind, play, forward)
    }
}

/** Tarjeta con la app abierta en la TV, sobre el color de su marca, y sus controles de reproducción. */
@Composable
private fun NowPlaying(app: com.mdl.tclremote.data.AppShortcut) {
    val brand = brandColor(app)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Brush.horizontalGradient(listOf(brand, brand.copy(alpha = 0.55f))))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AppIcon(app, 44)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Viendo ahora", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.8f))
                Text(app.name, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            mediaControls(app).forEach { control ->
                val main = control.key == Keys.MEDIA_PLAY_PAUSE
                RemoteButton(
                    { send(control.key) },
                    Modifier.size(if (main) 52.dp else 44.dp),
                    color = Color.White.copy(alpha = if (main) 0.95f else 0.2f),
                    repeat = control.repeat,
                ) {
                    Icon(
                        painterResource(control.icon),
                        control.label,
                        Modifier.size(if (main) 26.dp else 22.dp),
                        tint = if (main) brand else Color.White,
                    )
                }
            }
        }
    }
}

/** Sin conexión: explica qué pasa y ofrece soluciones en vez de un simple texto de error. */
@Composable
private fun OfflineCard(message: String, onOpenSettings: () -> Unit) {
    val context = LocalContext.current
    val canIr = remember { IrSender.hasEmitter(context) } && IrSender.isConfigured()
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(64.dp).background(Accent.copy(alpha = 0.15f), CircleShape), contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_tv_off), null, Modifier.size(32.dp), tint = Accent)
        }
        Spacer(Modifier.height(10.dp))
        Text("La TV no responde", style = MaterialTheme.typography.titleMedium)
        Text(
            message,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { TvRemote.launch { TvRemote.connection() } }) { Text("Reintentar") }
            if (canIr) {
                OutlinedButton(onClick = {
                    if (IrSender.sendPower(context)) TvRemote.notify("Infrarrojo enviado: apunta el móvil a la TV")
                }) {
                    Icon(painterResource(R.drawable.ic_ir), null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Encender por IR")
                }
            } else {
                TextButton(onClick = onOpenSettings) { Text("Ayuda") }
            }
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
        // Cinco por pantalla exactas (sin cortar la última); si hay más, la fila se desliza.
        BoxWithConstraints(Modifier.fillMaxWidth()) {
        val itemWidth = (maxWidth - 4.dp * 4) / 5
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            favorites.forEach { app ->
                Column(
                    Modifier
                        .width(itemWidth)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { TvRemote.launch { TvRemote.openApp(app.link) } }
                        .padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    AppIcon(app, 54)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        app.name,
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp),
                    )
                }
            }
        }
        }
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

/**
 * Volumen en una sola pieza: − a la izquierda, + a la derecha y, en medio, la barra con el nivel.
 * La barra se toca o se arrastra; al soltar se envían las pulsaciones para llegar a ese nivel.
 */
@Composable
private fun VolumeBar(volume: Int?, max: Int?, muted: Boolean, modifier: Modifier) {
    val color = MaterialTheme.colorScheme.surfaceContainerHighest
    Row(
        modifier.height(56.dp).background(color, RoundedCornerShape(28.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RemoteButton({ send(Keys.VOLUME_DOWN) }, Modifier.size(56.dp), color = color, repeat = true) {
            Icon(painterResource(R.drawable.ic_vol_down), "Bajar volumen")
        }
        if (volume != null && max != null && max > 0) {
            VolumeTrack(volume, max, muted, Modifier.weight(1f))
        } else {
            Text(
                "VOL",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
        }
        RemoteButton({ send(Keys.VOLUME_UP) }, Modifier.size(56.dp), color = color, repeat = true) {
            Icon(painterResource(R.drawable.ic_vol_up), "Subir volumen")
        }
    }
}

@Composable
private fun VolumeTrack(volume: Int, max: Int, muted: Boolean, modifier: Modifier) {
    val scope = rememberCoroutineScope()
    val current by rememberUpdatedState(volume)
    var target by remember { mutableStateOf<Int?>(null) }

    fun levelAt(x: Float, width: Int) = ((x / width.coerceAtLeast(1)).coerceIn(0f, 1f) * max).roundToInt()
    fun commit() {
        val goal = target ?: return
        target = null
        val diff = goal - current
        if (diff == 0) return
        scope.launch {
            repeat(abs(diff).coerceAtMost(100)) {
                send(if (diff > 0) Keys.VOLUME_UP else Keys.VOLUME_DOWN)
                delay(60)
            }
        }
    }

    val shown = target ?: volume
    val active = if (muted && target == null) MaterialTheme.colorScheme.onSurfaceVariant else Accent
    Box(
        modifier
            .fillMaxHeight()
            .padding(horizontal = 4.dp)
            .pointerInput(max) {
                detectTapGestures(onTap = { target = levelAt(it.x, size.width); commit() })
            }
            .pointerInput(max) {
                detectHorizontalDragGestures(
                    onDragStart = { target = levelAt(it.x, size.width) },
                    onDragEnd = { commit() },
                    onDragCancel = { target = null },
                ) { change, _ ->
                    change.consume()
                    target = levelAt(change.position.x, size.width)
                }
            },
    ) {
        Text(
            when {
                target != null -> "$shown"
                muted -> "Silencio"
                else -> "VOL $shown"
            },
            style = MaterialTheme.typography.labelSmall,
            color = if (target != null) Accent else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 9.dp),
        )
        Box(
            Modifier
                .align(Alignment.Center)
                .padding(top = 12.dp)
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(MaterialTheme.colorScheme.surfaceContainer),
        ) {
            Box(Modifier.fillMaxWidth(shown / max.toFloat()).fillMaxHeight().background(active))
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
    val glowColor = Accent
    var touching by remember { mutableStateOf(false) }
    var finger by remember { mutableStateOf(Offset.Zero) }
    val glow by animateFloatAsState(if (touching) 1f else 0f, tween(if (touching) 90 else 450), label = "glow")
    Box(
        Modifier
            .fillMaxWidth()
            .height(240.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHighest)
            // Brillo que sigue al dedo: confirma que el touchpad está respondiendo.
            .drawBehind {
                if (glow > 0f) {
                    val radius = 80.dp.toPx()
                    drawCircle(
                        Brush.radialGradient(listOf(glowColor.copy(alpha = 0.35f * glow), Color.Transparent), center = finger, radius = radius),
                        radius = radius,
                        center = finger,
                    )
                }
            }
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val change = awaitPointerEvent(PointerEventPass.Initial).changes.firstOrNull() ?: continue
                        touching = change.pressed
                        if (change.pressed) finger = change.position
                    }
                }
            }
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
    // (texto, tecla, icono): los controles de reproducción usan icono en vez de símbolos de texto.
    val keys: List<Triple<String, Int, Int?>> = listOf(
        Triple("Menú", Keys.MENU, null), Triple("Guía", Keys.GUIDE, null), Triple("Info", Keys.INFO, null),
        Triple("Canal +", Keys.CHANNEL_UP, null), Triple("Canal −", Keys.CHANNEL_DOWN, null), Triple("Entrada", Keys.TV_INPUT, null),
        Triple("Anterior", Keys.MEDIA_PREVIOUS, R.drawable.ic_skip_previous),
        Triple("Retroceder", Keys.MEDIA_REWIND, R.drawable.ic_fast_rewind),
        Triple("Avanzar", Keys.MEDIA_FAST_FORWARD, R.drawable.ic_fast_forward),
        Triple("Siguiente", Keys.MEDIA_NEXT, R.drawable.ic_skip_next),
        Triple("Reproducir", Keys.MEDIA_PLAY, R.drawable.ic_play),
        Triple("Pausa", Keys.MEDIA_PAUSE, R.drawable.ic_pause),
    ) + (1..9).map { Triple("$it", 7 + it, null) } + listOf(Triple("0", 7, null))
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Más botones") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                keys.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { (label, code, icon) ->
                            RemoteButton(
                                onPress = { send(code) },
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(14.dp),
                            ) {
                                if (icon != null) Icon(painterResource(icon), label)
                                else Text(label, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
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

/** Indicador grande de volumen que aparece un momento cuando cambia el volumen de la TV. */
@Composable
fun VolumeHud(modifier: Modifier = Modifier) {
    val state by TvRemote.state.collectAsState()
    var visible by remember { mutableStateOf(false) }
    var previous by remember { mutableStateOf<Pair<Int?, Boolean>?>(null) }
    LaunchedEffect(state.volume, state.muted) {
        val now = state.volume to state.muted
        val before = previous
        previous = now
        // No se muestra al conectar (primer valor), solo cuando el volumen cambia de verdad.
        if (before == null || before.first == null || state.volume == null || before == now) return@LaunchedEffect
        visible = true
        delay(1500)
        visible = false
    }
    AnimatedVisibility(
        visible,
        enter = fadeIn() + slideInVertically { -it },
        exit = fadeOut() + slideOutVertically { -it },
        modifier = modifier,
    ) {
        val volume = state.volume ?: 0
        val max = (state.maxVolume ?: 100).coerceAtLeast(1)
        Row(
            Modifier
                .width(260.dp)
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                painterResource(if (state.muted) R.drawable.ic_mute else R.drawable.ic_vol_up),
                null,
                tint = if (state.muted) MaterialTheme.colorScheme.onSurfaceVariant else Accent,
            )
            Spacer(Modifier.width(12.dp))
            Box(
                Modifier.weight(1f).height(8.dp).clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainer),
            ) {
                Box(
                    Modifier.fillMaxWidth(if (state.muted) 0f else volume / max.toFloat()).fillMaxHeight()
                        .background(Accent),
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(if (state.muted) "Silencio" else "$volume", style = MaterialTheme.typography.titleSmall)
        }
    }
}

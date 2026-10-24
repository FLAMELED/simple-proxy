package com.mdl.tclremote.ui

import android.os.SystemClock
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.AvKind
import com.mdl.tclremote.data.AvShortcut
import com.mdl.tclremote.data.Step
import com.mdl.tclremote.data.StepType
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.data.newId
import kotlin.math.roundToInt

private fun AvKind.label() = if (this == AvKind.PICTURE) "imagen" else "sonido"

@Composable
fun PictureSoundScreen() {
    val shortcuts by Store.avShortcuts.collectAsState()
    var recording by remember { mutableStateOf<AvShortcut?>(null) }
    var renaming by remember { mutableStateOf<AvShortcut?>(null) }
    var deleting by remember { mutableStateOf<AvShortcut?>(null) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Imagen y sonido", style = MaterialTheme.typography.headlineSmall)
        Text(
            "La TV no permite elegir el modo directamente, así que cada atajo repite el camino por el menú. " +
                "Grábalo una vez mirando la TV y después basta un toque. Mantén pulsado un atajo para regrabarlo, " +
                "renombrarlo o borrarlo.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        AvKind.entries.forEach { kind ->
            Section(if (kind == AvKind.PICTURE) "Modo de imagen" else "Modo de sonido") {
                val items = shortcuts.filter { it.kind == kind }
                items.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { s ->
                            ShortcutTile(
                                s,
                                onRecord = { recording = s },
                                onRename = { renaming = s },
                                onDelete = { deleting = s },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                OutlinedButton(onClick = {
                    renaming = AvShortcut(newId(), kind, "", emptyList())
                }) {
                    Icon(Icons.Default.Add, null)
                    Text("Añadir modo de ${kind.label()}")
                }
            }
        }
    }

    recording?.let { s ->
        Recorder(s, onDismiss = { recording = null }) {
            Store.saveAvShortcut(it)
            recording = null
            TvRemote.notify("“${it.name}” grabado")
        }
    }
    renaming?.let { s ->
        var name by remember(s.id) { mutableStateOf(s.name) }
        val isNew = Store.avShortcuts.value.none { it.id == s.id }
        AlertDialog(
            onDismissRequest = { renaming = null },
            title = { Text(if (isNew) "Nuevo modo de ${s.kind.label()}" else "Renombrar") },
            text = {
                OutlinedTextField(name, { name = it }, label = { Text("Nombre (como aparece en la TV)") }, singleLine = true)
            },
            confirmButton = {
                TextButton(enabled = name.isNotBlank(), onClick = {
                    val updated = s.copy(name = name.trim())
                    Store.saveAvShortcut(updated)
                    renaming = null
                    if (isNew) recording = updated
                }) { Text(if (isNew) "Grabar" else "Guardar") }
            },
            dismissButton = { TextButton(onClick = { renaming = null }) { Text("Cancelar") } },
        )
    }
    deleting?.let { s ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("¿Borrar “${s.name}”?") },
            confirmButton = {
                TextButton(onClick = { Store.deleteAvShortcut(s.id); deleting = null }) { Text("Borrar") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancelar") } },
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ShortcutTile(
    shortcut: AvShortcut,
    onRecord: () -> Unit,
    onRename: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val view = LocalView.current
    var menu by remember { mutableStateOf(false) }
    Box(modifier) {
        Column(
            Modifier
                .fillMaxWidth()
                .background(
                    if (shortcut.isRecorded) Accent.copy(alpha = 0.18f) else MaterialTheme.colorScheme.surfaceContainerHighest,
                    RoundedCornerShape(16.dp),
                )
                .combinedClickable(
                    onClick = {
                        view.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
                        if (shortcut.isRecorded) {
                            TvRemote.notify("Aplicando “${shortcut.name}”…")
                            TvRemote.launch { TvRemote.runScene(context, shortcut.asScene()) }
                        } else {
                            onRecord()
                        }
                    },
                    onLongClick = {
                        view.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS)
                        menu = true
                    },
                )
                .padding(14.dp),
        ) {
            Text(shortcut.name, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                if (shortcut.isRecorded) "Toca para aplicar" else "Sin grabar · toca para grabar",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            DropdownMenuItem(text = { Text("Grabar de nuevo") }, onClick = { menu = false; onRecord() })
            DropdownMenuItem(text = { Text("Renombrar") }, onClick = { menu = false; onRename() })
            DropdownMenuItem(text = { Text("Borrar") }, onClick = { menu = false; onDelete() })
        }
    }
}

/**
 * Graba las teclas que el usuario pulsa (y que se envían a la TV al momento), con las pausas
 * entre ellas para que los menús tengan tiempo de abrirse al reproducirlas.
 */
@Composable
private fun Recorder(shortcut: AvShortcut, onDismiss: () -> Unit, onSave: (AvShortcut) -> Unit) {
    val context = LocalContext.current
    val steps = remember { mutableStateListOf<Step>() }
    var lastPress by remember { mutableLongStateOf(0L) }

    fun press(code: Int, count: Int = 1) {
        val now = SystemClock.elapsedRealtime()
        if (steps.isNotEmpty()) {
            val gap = ((now - lastPress) / 1000.0).coerceIn(0.3, 1.8)
            steps += Step(StepType.DELAY, ((gap * 10).roundToInt() / 10.0).toString())
        }
        steps += Step(StepType.KEY, code.toString(), count)
        lastPress = now
        TvRemote.launch {
            repeat(count) {
                TvRemote.key(code)
                kotlinx.coroutines.delay(180)
            }
        }
    }

    fun undo() {
        if (steps.isNotEmpty()) steps.removeAt(steps.lastIndex)
        if (steps.lastOrNull()?.type == StepType.DELAY) steps.removeAt(steps.lastIndex)
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Cancelar") }
                    Column(Modifier.weight(1f)) {
                        Text("Grabando", style = MaterialTheme.typography.labelMedium, color = Accent)
                        Text("${shortcut.name} (${shortcut.kind.label()})", style = MaterialTheme.typography.titleLarge)
                    }
                    Button(enabled = steps.isNotEmpty(), onClick = { onSave(shortcut.copy(steps = steps.toList())) }) {
                        Text("Guardar")
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    "Mirando la TV: 1) abre el menú con ⚙ Ajustes, 2) baja hasta " +
                        (if (shortcut.kind == AvKind.PICTURE) "Imagen › Modo de imagen" else "Sonido › Modo de sonido") +
                        ", 3) elige «${shortcut.name}» con OK, 4) sal con Atrás. Cada botón se envía a la TV y se graba.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    "Consejo: al entrar en una lista, pulsa «Ir arriba» antes de bajar. Así el atajo funciona aunque " +
                        "la TV recuerde la última opción elegida.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    RecKey(Icons.Default.Settings, "Ajustes") { press(Keys.SETTINGS) }
                    RecKey(Icons.Default.Menu, "Menú") { press(Keys.MENU) }
                    RecKey(Icons.Default.Home, "Inicio") { press(Keys.HOME) }
                    RecKey(Icons.AutoMirrored.Filled.ArrowBack, "Atrás") { press(Keys.BACK) }
                }
                Spacer(Modifier.height(16.dp))
                Box(
                    Modifier.size(230.dp).align(Alignment.CenterHorizontally)
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(Modifier.align(Alignment.TopCenter)) { RecKey(Icons.Default.KeyboardArrowUp, "Arriba", 72) { press(Keys.DPAD_UP) } }
                    Box(Modifier.align(Alignment.BottomCenter)) { RecKey(Icons.Default.KeyboardArrowDown, "Abajo", 72) { press(Keys.DPAD_DOWN) } }
                    Box(Modifier.align(Alignment.CenterStart)) { RecKey(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Izquierda", 72) { press(Keys.DPAD_LEFT) } }
                    Box(Modifier.align(Alignment.CenterEnd)) { RecKey(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Derecha", 72) { press(Keys.DPAD_RIGHT) } }
                    RemoteButton({ press(Keys.DPAD_CENTER) }, Modifier.size(88.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh) {
                        Text("OK", style = MaterialTheme.typography.titleLarge)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { press(Keys.DPAD_UP, 12) }, modifier = Modifier.weight(1f)) { Text("⇈ Ir arriba") }
                    OutlinedButton(onClick = { undo() }, enabled = steps.isNotEmpty(), modifier = Modifier.weight(1f)) { Text("Deshacer") }
                }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        TvRemote.notify("Probando…")
                        TvRemote.launch { TvRemote.runScene(context, shortcut.copy(steps = steps.toList()).asScene()) }
                    },
                    enabled = steps.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Probar lo grabado") }
                Spacer(Modifier.height(12.dp))
                val keys = steps.filter { it.type == StepType.KEY }
                Text(
                    if (keys.isEmpty()) "Aún no hay pasos." else keys.joinToString(" → ") { Keys.label(it.value.toInt()) + if (it.count > 1) " ×${it.count}" else "" },
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun RecKey(icon: ImageVector, description: String, size: Int = 56, onPress: () -> Unit) {
    val ring = MaterialTheme.colorScheme.surfaceContainerHighest
    RemoteButton(onPress, Modifier.size(size.dp), color = ring) {
        Icon(icon, description, Modifier.size((size * 0.5f).dp))
    }
}

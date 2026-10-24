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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExtendedFloatingActionButton
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
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.AppShortcut
import com.mdl.tclremote.data.Scene
import com.mdl.tclremote.data.Step
import com.mdl.tclremote.data.StepType
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.data.newId
import com.mdl.tclremote.widget.RemoteWidget

@Composable
fun ScenesScreen() {
    val context = LocalContext.current
    val scenes by Store.scenes.collectAsState()
    val apps by Store.apps.collectAsState()
    var editing by remember { mutableStateOf<Scene?>(null) }
    var deleting by remember { mutableStateOf<Scene?>(null) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp, 16.dp, 16.dp, 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Escenas", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Varias acciones seguidas con un solo toque. También puedes usarlas en el widget y en los horarios.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            items(scenes, key = { it.id }) { scene ->
                Column(
                    Modifier.fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(20.dp))
                        .padding(16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(scene.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                        IconButton(onClick = { editing = scene }) { Icon(Icons.Default.Edit, "Editar") }
                        IconButton(onClick = { deleting = scene }) { Icon(Icons.Default.Delete, "Borrar") }
                    }
                    Text(
                        scene.steps.joinToString(" → ") { it.describe(apps) }.ifEmpty { "Sin pasos" },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = {
                        TvRemote.notify("Ejecutando “${scene.name}”")
                        TvRemote.launch { TvRemote.runScene(context, scene) }
                    }) {
                        Icon(Icons.Default.PlayArrow, null)
                        Text("Ejecutar")
                    }
                }
            }
        }
        ExtendedFloatingActionButton(
            onClick = { editing = Scene(newId(), "", emptyList()) },
            icon = { Icon(Icons.Default.Add, null) },
            text = { Text("Nueva escena") },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }

    editing?.let { scene ->
        SceneEditor(scene, apps, onDismiss = { editing = null }, onSave = {
            Store.saveScene(it)
            RemoteWidget.refresh(context)
            editing = null
        })
    }
    deleting?.let { scene ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("¿Borrar “${scene.name}”?") },
            text = { Text("También se borrarán los horarios que la usan.") },
            confirmButton = {
                TextButton(onClick = {
                    Store.deleteScene(scene.id)
                    RemoteWidget.refresh(context)
                    deleting = null
                }) { Text("Borrar") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun SceneEditor(scene: Scene, apps: List<AppShortcut>, onDismiss: () -> Unit, onSave: (Scene) -> Unit) {
    var name by remember { mutableStateOf(scene.name) }
    val steps = remember { mutableStateListOf<Step>().apply { addAll(scene.steps) } }
    var addMenu by remember { mutableStateOf(false) }
    var stepDialog by remember { mutableStateOf<StepType?>(null) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Cerrar") }
                    Text(
                        if (scene.name.isEmpty()) "Nueva escena" else "Editar escena",
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.weight(1f),
                    )
                    Button(
                        enabled = name.isNotBlank() && steps.isNotEmpty(),
                        onClick = { onSave(scene.copy(name = name.trim(), steps = steps.toList())) },
                    ) { Text("Guardar") }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nombre") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(16.dp))
                Text("Pasos", style = MaterialTheme.typography.titleSmall)
                LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    itemsIndexed(steps) { i, step ->
                        Row(
                            Modifier.fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(14.dp))
                                .padding(start = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("${i + 1}. ${step.describe(apps)}", modifier = Modifier.weight(1f))
                            IconButton(enabled = i > 0, onClick = {
                                steps.add(i - 1, steps.removeAt(i))
                            }) { Icon(Icons.Default.KeyboardArrowUp, "Subir") }
                            IconButton(onClick = { steps.removeAt(i) }) { Icon(Icons.Default.Delete, "Quitar") }
                        }
                    }
                }
                Box {
                    OutlinedButton(onClick = { addMenu = true }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Add, null)
                        Text("Añadir paso")
                    }
                    DropdownMenu(expanded = addMenu, onDismissRequest = { addMenu = false }) {
                        DropdownMenuItem(text = { Text("Encender TV") }, onClick = {
                            steps += Step(StepType.POWER_ON); addMenu = false
                        })
                        DropdownMenuItem(text = { Text("Apagar TV") }, onClick = {
                            steps += Step(StepType.POWER_OFF); addMenu = false
                        })
                        DropdownMenuItem(text = { Text("Pulsar tecla…") }, onClick = {
                            stepDialog = StepType.KEY; addMenu = false
                        })
                        DropdownMenuItem(text = { Text("Abrir app…") }, onClick = {
                            stepDialog = StepType.APP; addMenu = false
                        })
                        DropdownMenuItem(text = { Text("Esperar…") }, onClick = {
                            stepDialog = StepType.DELAY; addMenu = false
                        })
                        DropdownMenuItem(text = { Text("Infrarrojo: encender/apagar") }, onClick = {
                            steps += Step(StepType.IR_POWER); addMenu = false
                        })
                    }
                }
            }
        }
    }

    when (stepDialog) {
        StepType.KEY -> KeyStepDialog(onDismiss = { stepDialog = null }) { steps += it; stepDialog = null }
        StepType.APP -> AppStepDialog(apps, onDismiss = { stepDialog = null }) { steps += it; stepDialog = null }
        StepType.DELAY -> DelayStepDialog(onDismiss = { stepDialog = null }) { steps += it; stepDialog = null }
        else -> Unit
    }
}

@Composable
private fun KeyStepDialog(onDismiss: () -> Unit, onAdd: (Step) -> Unit) {
    var key by remember { mutableStateOf(Keys.catalog.first()) }
    var count by remember { mutableStateOf("1") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pulsar tecla") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Picker("Tecla", Keys.catalog, key, { it.first }, { key = it })
                OutlinedTextField(
                    value = count,
                    onValueChange = { count = it.filter(Char::isDigit).take(2) },
                    label = { Text("Veces") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onAdd(Step(StepType.KEY, key.second.toString(), (count.toIntOrNull() ?: 1).coerceIn(1, 50)))
            }) { Text("Añadir") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun AppStepDialog(apps: List<AppShortcut>, onDismiss: () -> Unit, onAdd: (Step) -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Abrir app") },
        text = {
            LazyColumn {
                items(apps) { app ->
                    TextButton(onClick = { onAdd(Step(StepType.APP, app.link)) }, modifier = Modifier.fillMaxWidth()) {
                        Text(app.name, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
private fun DelayStepDialog(onDismiss: () -> Unit, onAdd: (Step) -> Unit) {
    var seconds by remember { mutableStateOf("5") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Esperar") },
        text = {
            Column {
                Text(
                    "Útil tras encender la TV: tarda unos segundos en poder abrir apps.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = seconds,
                    onValueChange = { seconds = it.filter { c -> c.isDigit() || c == '.' }.take(4) },
                    label = { Text("Segundos") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val s = (seconds.toDoubleOrNull() ?: 1.0).coerceIn(0.1, 120.0)
                onAdd(Step(StepType.DELAY, if (s % 1.0 == 0.0) s.toInt().toString() else s.toString()))
            }) { Text("Añadir") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

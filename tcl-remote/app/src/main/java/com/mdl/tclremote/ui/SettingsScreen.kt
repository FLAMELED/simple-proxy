package com.mdl.tclremote.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.atv.DebugLog
import com.mdl.tclremote.atv.Discovery
import com.mdl.tclremote.atv.FoundTv
import com.mdl.tclremote.atv.Identity
import com.mdl.tclremote.atv.PairingSecret
import com.mdl.tclremote.atv.PairingSession
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.AppShortcut
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ir.IrCodes
import com.mdl.tclremote.ir.IrSender
import com.mdl.tclremote.widget.RemoteWidget
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

@Composable
fun SettingsScreen() {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Ajustes", style = MaterialTheme.typography.headlineSmall)
        TvSection()
        IrSection()
        WidgetSection()
        AppsSection()
        LogSection()
    }
}

private enum class PairStep { IDLE, STARTING, CODE, CHECKING }

@Composable
private fun TvSection() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val host by Store.host.collectAsState()
    val paired by Store.paired.collectAsState()
    var ip by remember(host) { mutableStateOf(host) }
    var scanning by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf<List<FoundTv>>(emptyList()) }
    var step by remember { mutableStateOf(PairStep.IDLE) }
    var session by remember { mutableStateOf<PairingSession?>(null) }
    var code by remember { mutableStateOf("") }
    var codeError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(scanning) {
        if (!scanning) return@LaunchedEffect
        withTimeoutOrNull(12_000) {
            try {
                Discovery.scan(context).collect { found = it }
            } catch (e: Exception) {
                TvRemote.notify(e.message ?: "Error al buscar")
            }
        }
        scanning = false
    }

    fun startPairing() {
        Store.setHost(ip)
        TvRemote.disconnect()
        DebugLog.clear()
        step = PairStep.STARTING
        code = ""
        codeError = null
        scope.launch {
            val s = PairingSession(ip.trim())
            try {
                withContext(Dispatchers.IO) { s.start(Build.MODEL) }
                session = s
                step = PairStep.CODE
            } catch (e: Exception) {
                s.close()
                step = PairStep.IDLE
                TvRemote.notify("No se pudo iniciar la vinculación. Mira el registro al final de Ajustes.")
            }
        }
    }

    Section("Televisor") {
        Text(
            "La TV y el teléfono deben estar en la misma red WiFi.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = ip,
            onValueChange = { ip = it.trim() },
            label = { Text("IP de la TV (ej. 192.168.1.50)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { found = emptyList(); scanning = true }, enabled = !scanning) {
                Text(if (scanning) "Buscando…" else "Buscar en la red")
            }
            OutlinedButton(onClick = {
                Store.setHost(ip)
                TvRemote.disconnect()
                TvRemote.launch { TvRemote.connection() }
            }, enabled = ip.isNotBlank()) { Text("Guardar") }
        }
        found.forEach { tv ->
            TextButton(onClick = { ip = tv.host; Store.setHost(tv.host) }, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.fillMaxWidth()) {
                    Text(tv.name + if (tv.host == ip) "  ✓" else "")
                    Text(tv.host, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (found.size > 1) {
            Text(
                "Aparecen también tus Mi Box y otras Android TV: elige la que se llame como la TCL.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        Text(
            "Para asegurarte, mira la IP en la TV: Ajustes › Red e Internet › tu WiFi.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            if (paired) "✓ Teléfono vinculado con la TV" else "Falta vincular: la TV mostrará un código.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = { startPairing() }, enabled = ip.isNotBlank() && step == PairStep.IDLE) {
                Text(if (paired) "Volver a vincular" else "Vincular")
            }
            if (step == PairStep.STARTING) CircularProgressIndicator(Modifier.padding(4.dp))
            if (paired) {
                TextButton(onClick = {
                    TvRemote.disconnect()
                    Identity.reset()
                    Store.setPaired(false)
                }) { Text("Olvidar") }
            }
        }
        Text(
            "Para poder encender la TV por WiFi, activa en la TV la opción de mantener la red activa en reposo " +
                "(según el menú: «Activación por WiFi», «Wake on LAN» o «Inicio rápido»). Si no, usa el infrarrojo.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    if (step == PairStep.CODE || step == PairStep.CHECKING) {
        val cancel = {
            session?.close()
            session = null
            step = PairStep.IDLE
        }
        AlertDialog(
            onDismissRequest = { if (step == PairStep.CODE) cancel() },
            title = { Text("Código de la TV") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Ha respondido: «${session?.serverName ?: "aparato sin nombre"}». " +
                            "Escribe el código de 6 caracteres que aparece en su pantalla.",
                    )
                    Text(
                        "Si el código sale en otro aparato (por ejemplo una Mi Box), la IP no es la de la TCL.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(6); codeError = null },
                        singleLine = true,
                        isError = codeError != null,
                        supportingText = codeError?.let { { Text(it) } },
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Characters,
                            keyboardType = KeyboardType.Ascii,
                        ),
                        textStyle = MaterialTheme.typography.headlineSmall,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = PairingSecret.isValidFormat(code) && step == PairStep.CODE,
                    onClick = {
                        val s = session ?: return@TextButton
                        step = PairStep.CHECKING
                        scope.launch {
                            try {
                                val ok = withContext(Dispatchers.IO) { s.finish(code) }
                                if (ok) {
                                    session = null
                                    step = PairStep.IDLE
                                    Store.setPaired(true)
                                    TvRemote.notify("¡Vinculado! Ya puedes usar el mando.")
                                    TvRemote.launch { TvRemote.connection() }
                                } else {
                                    codeError = "Código incorrecto, revísalo"
                                    step = PairStep.CODE
                                }
                            } catch (e: Exception) {
                                s.close()
                                session = null
                                step = PairStep.IDLE
                                TvRemote.notify("Vinculación fallida: ${e.message ?: e.javaClass.simpleName}")
                            }
                        }
                    },
                ) { Text(if (step == PairStep.CHECKING) "Comprobando…" else "Vincular") }
            },
            dismissButton = { TextButton(onClick = cancel, enabled = step == PairStep.CODE) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun IrSection() {
    val context = LocalContext.current
    val irCode by Store.irCode.collectAsState()
    val hasIr = remember { IrSender.hasEmitter(context) }
    var pronto by remember(irCode) { mutableStateOf(if (irCode.startsWith("candidate:")) "" else irCode) }

    fun test(code: String) {
        val signal = IrSender.signalFor(code)
        if (signal == null) {
            TvRemote.notify("Código no válido")
            return
        }
        runCatching { IrSender.send(context, signal) }
            .onSuccess { TvRemote.notify("Enviado. Apunta el móvil a la TV.") }
            .onFailure { TvRemote.notify(it.message ?: "Error de infrarrojo") }
    }

    Section("Infrarrojo (encender cuando la TV no responde por WiFi)") {
        if (!hasIr) {
            Text("Este teléfono no tiene emisor de infrarrojos.")
            return@Section
        }
        Text(
            "Prueba los códigos apuntando a la TV y marca el que la encienda o apague.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = irCode.isBlank(), onClick = { Store.setIrCode("") })
            Text("No usar infrarrojo", Modifier.weight(1f))
        }
        IrCodes.powerCandidates.forEachIndexed { i, (name, _) ->
            val value = IrSender.candidateCode(i)
            Row(verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = irCode == value, onClick = { Store.setIrCode(value) })
                Text(name, Modifier.weight(1f))
                TextButton(onClick = { test(value) }) { Text("Probar") }
            }
        }
        OutlinedTextField(
            value = pronto,
            onValueChange = { pronto = it },
            label = { Text("Código Pronto propio (opcional)") },
            placeholder = { Text("0000 006D 0022 0002 …") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { test(pronto) }, enabled = pronto.isNotBlank()) { Text("Probar") }
            OutlinedButton(onClick = {
                if (IrSender.signalFor(pronto) != null) Store.setIrCode(pronto) else TvRemote.notify("Código Pronto no válido")
            }, enabled = pronto.isNotBlank()) { Text("Usar este") }
        }
    }
}

@Composable
private fun WidgetSection() {
    val context = LocalContext.current
    val scenes by Store.scenes.collectAsState()
    val selected by Store.widgetScenes.collectAsState()
    Section("Widget") {
        Text(
            "Mantén pulsada la pantalla de inicio › Widgets › Mi TCL. Tiene encendido, volumen, silencio y dos escenas:",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        val none = "" to "(ninguna)"
        val options = listOf(none) + scenes.map { it.id to it.name }
        (0..1).forEach { slot ->
            val current = selected.getOrNull(slot)
            Picker(
                "Escena ${slot + 1}",
                options,
                options.firstOrNull { it.first == current } ?: none,
                { "Botón ${slot + 1}: ${it.second}" },
                { choice ->
                    val list = MutableList(2) { selected.getOrNull(it) ?: "" }
                    list[slot] = choice.first
                    Store.setWidgetScenes(list.filter { it.isNotEmpty() })
                    RemoteWidget.refresh(context)
                },
                Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun AppsSection() {
    val context = LocalContext.current
    val apps by Store.apps.collectAsState()
    var adding by remember { mutableStateOf(false) }
    Section("Apps rápidas") {
        apps.forEachIndexed { i, app ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AppIcon(app, 40)
                Column(Modifier.weight(1f)) {
                    Text(app.name)
                    Text(app.link, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = { Store.setApps(apps.filterIndexed { j, _ -> j != i }) }) {
                    Icon(Icons.Default.Delete, "Quitar")
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { adding = true }) { Text("Añadir app") }
            TextButton(onClick = { Store.setApps(Store.defaultApps) }) { Text("Restaurar") }
            TextButton(onClick = { TvRemote.launch { AppIcons.clear(context) } }) { Text("Recargar iconos") }
        }
    }
    if (adding) {
        var name by remember { mutableStateOf("") }
        var link by remember { mutableStateOf("market://launch?id=") }
        AlertDialog(
            onDismissRequest = { adding = false },
            title = { Text("Añadir app") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(name, { name = it }, label = { Text("Nombre") }, singleLine = true)
                    OutlinedTextField(link, { link = it.trim() }, label = { Text("Enlace") }, singleLine = true)
                    Text(
                        "Usa market://launch?id= seguido del nombre del paquete de la app en la TV " +
                            "(por ejemplo com.plexapp.android).",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = name.isNotBlank() && link.length > "market://launch?id=".length,
                    onClick = {
                        Store.setApps(apps + AppShortcut(name.trim(), link))
                        adding = false
                    },
                ) { Text("Añadir") }
            },
            dismissButton = { TextButton(onClick = { adding = false }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun LogSection() {
    val context = LocalContext.current
    val lines by DebugLog.lines.collectAsState()
    Section("Registro (para diagnosticar)") {
        if (lines.isEmpty()) {
            Text("Vacío. Pulsa «Vincular» y vuelve aquí.", style = MaterialTheme.typography.bodySmall)
        } else {
            Text(
                lines.takeLast(30).joinToString("\n"),
                style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = {
                val text = "Mi TCL ${Build.MANUFACTURER} ${Build.MODEL} Android ${Build.VERSION.RELEASE}\n" +
                    lines.joinToString("\n")
                context.getSystemService(ClipboardManager::class.java)
                    .setPrimaryClip(ClipData.newPlainText("Registro Mi TCL", text))
                TvRemote.notify("Registro copiado")
            }, enabled = lines.isNotEmpty()) { Text("Copiar") }
            TextButton(onClick = { DebugLog.clear() }) { Text("Borrar") }
        }
    }
}

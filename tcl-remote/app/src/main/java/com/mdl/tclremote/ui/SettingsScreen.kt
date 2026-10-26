package com.mdl.tclremote.ui

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.mdl.tclremote.atv.DebugLog
import com.mdl.tclremote.atv.Discovery
import com.mdl.tclremote.atv.FoundTv
import com.mdl.tclremote.atv.Identity
import com.mdl.tclremote.atv.PairingFlow
import com.mdl.tclremote.atv.PairingState
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Flag
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ir.IrCodes
import com.mdl.tclremote.ir.IrSender
import com.mdl.tclremote.system.ControlNotification
import com.mdl.tclremote.widget.RemoteWidget
import kotlinx.coroutines.withTimeoutOrNull

@Composable
fun SettingsScreen() {
    var advanced by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("Ajustes", style = MaterialTheme.typography.headlineSmall)
        TvSection()
        PreferencesSection()
        WidgetSection()
        Row(
            Modifier.fillMaxWidth().clickable { advanced = !advanced }.padding(vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Avanzado", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
            Text(if (advanced) "▴" else "▾", color = MaterialTheme.colorScheme.primary)
        }
        AnimatedVisibility(advanced) {
            Column {
                IrSection()
                LogSection()
                ForgetSection()
            }
        }
    }
    PairingCodeDialog()
}

@Composable
private fun TvSection() {
    val context = LocalContext.current
    val host by Store.host.collectAsState()
    val paired by Store.paired.collectAsState()
    val pairing by PairingFlow.state.collectAsState()
    var ip by remember(host) { mutableStateOf(host) }
    var scanning by remember { mutableStateOf(false) }
    var found by remember { mutableStateOf<List<FoundTv>>(emptyList()) }

    LaunchedEffect(scanning) {
        if (!scanning) return@LaunchedEffect
        withTimeoutOrNull(12_000) {
            try {
                Discovery.scan(context).collect { found = it }
            } catch (e: Exception) {
                TvRemote.notify("No se pudo buscar en la red")
            }
        }
        scanning = false
    }

    Section("Televisor") {
        Text(
            if (paired) "✓ Vinculado con la TV en ${host.ifBlank { "—" }}" else "Este móvil aún no está vinculado con la TV.",
            style = MaterialTheme.typography.bodyMedium,
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
                TvRemote.autoConnect()
            }, enabled = ip.isNotBlank() && ip != host) { Text("Guardar IP") }
        }
        found.forEach { tv ->
            TextButton(onClick = { ip = tv.host }, modifier = Modifier.fillMaxWidth()) {
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
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = { PairingFlow.start(ip) }, enabled = ip.isNotBlank() && pairing == PairingState.Idle) {
                Text(if (paired) "Volver a vincular" else "Vincular")
            }
            if (pairing == PairingState.Starting) CircularProgressIndicator(Modifier.padding(4.dp))
        }
        Text(
            "Para encender la TV por WiFi, activa en la TV la opción de mantener la red activa en reposo " +
                "(«Activación por WiFi», «Wake on LAN» o «Inicio rápido»).",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SwitchRow(title: String, subtitle: String, flag: Flag, onChange: (Boolean) -> Unit = { flag.set(it) }) {
    val checked by flag.value.collectAsState()
    Row(
        Modifier.fillMaxWidth().clickable { onChange(!checked) },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

@Composable
private fun PreferencesSection() {
    val context = LocalContext.current
    val phonePermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        Store.pauseOnCall.set(granted)
        if (!granted) TvRemote.notify("Sin el permiso de llamadas no se puede pausar la TV")
    }
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        Store.controlNotification.set(granted)
        ControlNotification.update(context)
        if (!granted) TvRemote.notify("Sin permiso de notificaciones no se puede mostrar el control")
    }
    fun granted(permission: String) =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    Section("Preferencias") {
        SwitchRow("Botones de volumen del móvil", "Con la app abierta, suben y bajan el volumen de la TV", Store.volumeKeys)
        SwitchRow("Pantalla siempre encendida", "Mientras usas el mando", Store.keepScreenOn)
        SwitchRow("Colores del sistema", "Usa los colores de tu fondo de pantalla (Material You)", Store.dynamicColor)
        SwitchRow("Agitar para silenciar", "Agita el móvil con la app abierta", Store.shakeToMute)
        SwitchRow(
            "Pausar la TV al recibir una llamada",
            "Y la reanuda al colgar",
            Store.pauseOnCall,
            onChange = { on ->
                if (on && !granted(Manifest.permission.READ_PHONE_STATE)) {
                    phonePermission.launch(Manifest.permission.READ_PHONE_STATE)
                } else {
                    Store.pauseOnCall.set(on)
                }
            },
        )
        SwitchRow(
            "Control en notificaciones",
            "Encendido, volumen y play/pausa en la cortina y la pantalla de bloqueo",
            Store.controlNotification,
            onChange = { on ->
                if (on && Build.VERSION.SDK_INT >= 33 && !granted(Manifest.permission.POST_NOTIFICATIONS)) {
                    notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    Store.controlNotification.set(on)
                    ControlNotification.update(context)
                }
            },
        )
    }
}

@Composable
private fun ForgetSection() {
    val paired by Store.paired.collectAsState()
    if (!paired) return
    Section("Vinculación") {
        Text(
            "Olvidar borra el certificado de este móvil. Tendrás que volver a introducir el código de la TV.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedButton(onClick = {
            TvRemote.disconnect()
            Identity.reset()
            Store.setPaired(false)
        }) { Text("Olvidar esta TV") }
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

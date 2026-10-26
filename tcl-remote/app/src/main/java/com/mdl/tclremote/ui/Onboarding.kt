package com.mdl.tclremote.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Discovery
import com.mdl.tclremote.atv.FoundTv
import com.mdl.tclremote.atv.PairingFlow
import com.mdl.tclremote.atv.PairingState
import com.mdl.tclremote.data.Store
import kotlinx.coroutines.withTimeoutOrNull

private enum class Step { WELCOME, SEARCH, CODE, DONE }

/** Asistente de primer uso: buscar la TV, vincular con el código y listo. */
@Composable
fun Onboarding(onFinish: () -> Unit) {
    val pairing by PairingFlow.state.collectAsState()
    var started by remember { mutableStateOf(false) }
    val step = when {
        pairing is PairingState.Done -> Step.DONE
        pairing is PairingState.WaitingCode || pairing is PairingState.Checking -> Step.CODE
        started -> Step.SEARCH
        else -> Step.WELCOME
    }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                StepDots(step.ordinal, Modifier.weight(1f))
                if (step != Step.DONE) {
                    TextButton(onClick = {
                        PairingFlow.cancel()
                        Store.onboardingDone.set(true)
                        onFinish()
                    }) { Text("Saltar") }
                }
            }
            AnimatedContent(
                step,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                modifier = Modifier.weight(1f),
                label = "onboarding",
            ) { current ->
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.Center,
                ) {
                    when (current) {
                        Step.WELCOME -> Welcome { started = true }
                        Step.SEARCH -> Search(pairing)
                        Step.CODE -> {
                            Title(R.drawable.ic_tv, "Mira la TV")
                            Spacer(Modifier.height(16.dp))
                            PairingCodeField(pairing) { PairingFlow.submit(it) }
                            TextButton(onClick = { PairingFlow.cancel() }) { Text("Volver") }
                        }
                        Step.DONE -> {
                            Title(R.drawable.ic_remote, "¡Listo!")
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "El móvil ya controla tu TCL. Prueba el touchpad, el teclado y tus apps favoritas.",
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(24.dp))
                            Button(onClick = {
                                PairingFlow.acknowledge()
                                Store.onboardingDone.set(true)
                                onFinish()
                            }, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Empezar") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StepDots(current: Int, modifier: Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(4) { i ->
            Box(
                Modifier.size(width = if (i == current) 22.dp else 8.dp, height = 8.dp)
                    .background(if (i <= current) Accent else MaterialTheme.colorScheme.surfaceContainerHighest, CircleShape),
            )
        }
    }
}

@Composable
private fun Title(icon: Int, text: String) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(88.dp).background(Accent.copy(alpha = 0.18f), CircleShape), contentAlignment = Alignment.Center) {
            Icon(painterResource(icon), null, Modifier.size(44.dp), tint = Accent)
        }
        Spacer(Modifier.height(16.dp))
        Text(text, style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
    }
}

@Composable
private fun Welcome(onStart: () -> Unit) {
    Title(R.drawable.ic_remote, "Mi TCL")
    Spacer(Modifier.height(12.dp))
    Text(
        "Controla tu TCL 65C6K desde el móvil: touchpad, teclado, apps, escenas, horarios y widgets.",
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(12.dp))
    Text(
        "Enciende la TV y comprueba que está en la misma WiFi que el móvil.",
        textAlign = TextAlign.Center,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(28.dp))
    Button(onClick = onStart, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Buscar mi TV") }
}

@Composable
private fun Search(pairing: PairingState) {
    val context = LocalContext.current
    var found by remember { mutableStateOf<List<FoundTv>>(emptyList()) }
    var scanRound by remember { mutableIntStateOf(0) }
    var scanning by remember { mutableStateOf(true) }
    var manual by remember { mutableStateOf(false) }
    var ip by remember { mutableStateOf(Store.host.value) }

    LaunchedEffect(scanRound) {
        scanning = true
        withTimeoutOrNull(12_000) {
            runCatching { Discovery.scan(context).collect { found = it } }
        }
        scanning = false
    }

    Title(R.drawable.ic_tv, if (pairing == PairingState.Starting) "Conectando…" else "Elige tu TV")
    Spacer(Modifier.height(16.dp))
    if (pairing is PairingState.Failed) {
        Text(pairing.message, color = Accent, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
    }
    // La TCL primero: el resto suelen ser Mi Box u otras Android TV de la casa.
    val sorted = found.sortedByDescending { "tcl" in it.name.lowercase() || "65c6k" in it.name.lowercase() }
    sorted.forEach { tv ->
        val isTcl = "tcl" in tv.name.lowercase() || "65c6k" in tv.name.lowercase()
        Row(
            Modifier.fillMaxWidth().padding(vertical = 4.dp)
                .background(
                    if (isTcl) Accent.copy(alpha = 0.18f) else MaterialTheme.colorScheme.surfaceContainer,
                    RoundedCornerShape(16.dp),
                )
                .clickable(enabled = pairing != PairingState.Starting) { PairingFlow.start(tv.host) }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(R.drawable.ic_tv), null, tint = if (isTcl) Accent else Color.Unspecified)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(tv.name)
                Text(tv.host, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (isTcl) Text("Tu TCL", color = Accent, style = MaterialTheme.typography.labelLarge)
        }
    }
    if (scanning || pairing == PairingState.Starting) {
        Spacer(Modifier.height(12.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    } else if (found.isEmpty()) {
        Text(
            "No encontré ninguna TV. ¿Está encendida y en la misma WiFi?",
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
    Spacer(Modifier.height(12.dp))
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
        OutlinedButton(onClick = { found = emptyList(); scanRound++ }, enabled = !scanning) { Text("Buscar otra vez") }
        TextButton(onClick = { manual = !manual }) { Text("Escribir IP") }
    }
    if (manual) {
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = ip,
            onValueChange = { ip = it.trim() },
            label = { Text("IP de la TV") },
            supportingText = { Text("En la TV: Ajustes › Red e Internet › tu WiFi") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = { PairingFlow.start(ip) },
            enabled = ip.isNotBlank() && pairing != PairingState.Starting,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Conectar") }
    }
}

package com.mdl.tclremote.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.atv.PairingFlow
import com.mdl.tclremote.atv.PairingSecret
import com.mdl.tclremote.atv.PairingState
import com.mdl.tclremote.atv.TvRemote

/** Campo para el código de 6 caracteres que muestra la TV. */
@Composable
fun PairingCodeField(state: PairingState, onSubmit: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    val error = (state as? PairingState.WaitingCode)?.error
    val deviceName = when (state) {
        is PairingState.WaitingCode -> state.deviceName
        is PairingState.Checking -> state.deviceName
        else -> null
    }
    LaunchedEffect(error) { if (error != null) code = "" }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Escribe el código de 6 caracteres que aparece en la pantalla de «${deviceName ?: "la TV"}».")
        Text(
            "Si el código sale en otro aparato (por ejemplo una Mi Box), la IP no es la de la TCL.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(6) },
            singleLine = true,
            isError = error != null,
            supportingText = error?.let { { Text(it) } },
            placeholder = { Text("A1B2C3", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center) },
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
                keyboardType = KeyboardType.Ascii,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(onDone = { if (PairingSecret.isValidFormat(code)) onSubmit(code) }),
            textStyle = MaterialTheme.typography.headlineMedium.copy(textAlign = TextAlign.Center),
            modifier = Modifier.fillMaxWidth(),
        )
        TextButton(
            onClick = { onSubmit(code) },
            enabled = PairingSecret.isValidFormat(code) && state is PairingState.WaitingCode,
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (state is PairingState.Checking) "Comprobando…" else "Vincular") }
    }
}

/** Diálogo de vinculación para Ajustes: aparece mientras la TV espera el código y avisa del resultado. */
@Composable
fun PairingCodeDialog() {
    val state by PairingFlow.state.collectAsState()
    LaunchedEffect(state) {
        when (val s = state) {
            is PairingState.Done -> {
                TvRemote.notify("¡Vinculado! Ya puedes usar el mando.")
                PairingFlow.acknowledge()
            }
            is PairingState.Failed -> {
                TvRemote.notify(s.message)
                PairingFlow.acknowledge()
            }
            else -> Unit
        }
    }
    if (state is PairingState.WaitingCode || state is PairingState.Checking) {
        AlertDialog(
            onDismissRequest = { if (state is PairingState.WaitingCode) PairingFlow.cancel() },
            title = { Text("Código de la TV") },
            text = { PairingCodeField(state) { PairingFlow.submit(it) } },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { PairingFlow.cancel() }, enabled = state is PairingState.WaitingCode) { Text("Cancelar") }
            },
        )
    }
}

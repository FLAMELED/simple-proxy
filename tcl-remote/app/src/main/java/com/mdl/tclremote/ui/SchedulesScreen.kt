package com.mdl.tclremote.ui

import android.app.TimePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.data.Scene
import com.mdl.tclremote.data.Schedule
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.data.newId
import com.mdl.tclremote.work.Scheduler
import java.util.Calendar

/** Lunes primero, con la numeración de Calendar. */
private val weekDays = listOf(
    Calendar.MONDAY to "L", Calendar.TUESDAY to "M", Calendar.WEDNESDAY to "X", Calendar.THURSDAY to "J",
    Calendar.FRIDAY to "V", Calendar.SATURDAY to "S", Calendar.SUNDAY to "D",
)

private fun daysLabel(days: Set<Int>) = when {
    days.isEmpty() || days.size == 7 -> "Todos los días"
    days == setOf(Calendar.MONDAY, Calendar.TUESDAY, Calendar.WEDNESDAY, Calendar.THURSDAY, Calendar.FRIDAY) -> "Lunes a viernes"
    days == setOf(Calendar.SATURDAY, Calendar.SUNDAY) -> "Fines de semana"
    else -> weekDays.filter { it.first in days }.joinToString(" ") { it.second }
}

private fun time(h: Int, m: Int) = "%02d:%02d".format(h, m)

@Composable
fun SchedulesScreen() {
    val context = LocalContext.current
    val schedules by Store.schedules.collectAsState()
    val scenes by Store.scenes.collectAsState()
    var editing by remember { mutableStateOf<Schedule?>(null) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp, 16.dp, 16.dp, 96.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("Horarios", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Ejecuta una escena a una hora, por ejemplo apagar la TV a la 1:00 si te quedas dormido.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (schedules.isEmpty()) {
                item {
                    Text(
                        "Aún no hay horarios.",
                        modifier = Modifier.padding(top = 24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(schedules, key = { it.id }) { s ->
                Row(
                    Modifier.fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceContainer, RoundedCornerShape(20.dp))
                        .clickable { editing = s }
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(time(s.hour, s.minute), style = MaterialTheme.typography.headlineMedium)
                        Text(
                            daysLabel(s.days) + " · " + (Store.scene(s.sceneId)?.name ?: "¿escena borrada?"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    IconButton(onClick = {
                        Scheduler.cancel(context, s)
                        Store.deleteSchedule(s.id)
                    }) { Icon(Icons.Default.Delete, "Borrar") }
                    Switch(checked = s.enabled, onCheckedChange = {
                        val updated = s.copy(enabled = it)
                        Store.saveSchedule(updated)
                        Scheduler.schedule(context, updated)
                    })
                }
            }
        }
        if (scenes.isNotEmpty()) {
            ExtendedFloatingActionButton(
                onClick = { editing = Schedule(newId(), 23, 0, emptySet(), scenes.first().id, true) },
                icon = { Icon(Icons.Default.Add, null) },
                text = { Text("Nuevo horario") },
                modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
            )
        }
    }

    editing?.let { s ->
        ScheduleEditor(s, scenes, onDismiss = { editing = null }) {
            Store.saveSchedule(it)
            Scheduler.schedule(context, it)
            editing = null
        }
    }
}

@Composable
private fun ScheduleEditor(schedule: Schedule, scenes: List<Scene>, onDismiss: () -> Unit, onSave: (Schedule) -> Unit) {
    val context = LocalContext.current
    var hour by remember { mutableIntStateOf(schedule.hour) }
    var minute by remember { mutableIntStateOf(schedule.minute) }
    var days by remember { mutableStateOf(schedule.days) }
    var sceneId by remember { mutableStateOf(schedule.sceneId) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Horario") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedButton(onClick = {
                    TimePickerDialog(context, { _, h, m -> hour = h; minute = m }, hour, minute, true).show()
                }, modifier = Modifier.fillMaxWidth()) {
                    Text(time(hour, minute), style = MaterialTheme.typography.headlineMedium)
                }
                Text("Días (ninguno = todos)", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    weekDays.forEach { (day, label) ->
                        FilterChip(
                            selected = day in days,
                            onClick = { days = if (day in days) days - day else days + day },
                            label = { Text(label) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                Text("Escena", style = MaterialTheme.typography.labelMedium)
                Picker("Escena", scenes, scenes.firstOrNull { it.id == sceneId }, { it.name }, { sceneId = it.id })
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(schedule.copy(hour = hour, minute = minute, days = days, sceneId = sceneId, enabled = true))
            }) { Text("Guardar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

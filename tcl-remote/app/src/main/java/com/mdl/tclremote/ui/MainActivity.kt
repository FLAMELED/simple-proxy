package com.mdl.tclremote.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.TvRemote

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { AppTheme { App() } }
    }

    override fun onStart() {
        super.onStart()
        TvRemote.keepAlive = true
        TvRemote.launch { TvRemote.connection() }
    }

    override fun onStop() {
        super.onStop()
        TvRemote.keepAlive = false
    }
}

val Accent = Color(0xFFE5484D)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            onPrimary = Color.White,
            secondary = Color(0xFF8E9BFF),
            background = Color(0xFF101114),
            surface = Color(0xFF101114),
            surfaceVariant = Color(0xFF24262E),
            surfaceContainer = Color(0xFF1B1C22),
            surfaceContainerHigh = Color(0xFF24262E),
            surfaceContainerHighest = Color(0xFF2D2F38),
            onSurface = Color(0xFFF2F2F5),
            onSurfaceVariant = Color(0xFFB4B6C2),
        ),
        content = content,
    )
}

private data class Tab(val label: String, val icon: Int)

private val tabs = listOf(
    Tab("Mando", R.drawable.ic_remote),
    Tab("Escenas", R.drawable.ic_scenes),
    Tab("Horarios", R.drawable.ic_auto),
    Tab("Ajustes", R.drawable.ic_tv),
)

@Composable
private fun App() {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(Unit) {
        TvRemote.messages.collect { snackbar.showSnackbar(it) }
    }
    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                tabs.forEachIndexed { i, t ->
                    NavigationBarItem(
                        selected = tab == i,
                        onClick = { tab = i },
                        icon = { Icon(painterResource(t.icon), null, Modifier.size(24.dp)) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = Accent.copy(alpha = 0.25f),
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                0 -> RemoteScreen(onOpenSettings = { tab = 3 })
                1 -> ScenesScreen()
                2 -> SchedulesScreen()
                else -> SettingsScreen()
            }
        }
    }
}

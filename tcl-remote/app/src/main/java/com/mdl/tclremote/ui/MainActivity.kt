package com.mdl.tclremote.ui

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.wrapContentWidth
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
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.activity.SystemBarStyle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.Link
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.system.Updates
import kotlinx.coroutines.launch
import kotlin.math.sqrt

class MainActivity : ComponentActivity() {
    private var lastVolumeKey = 0L
    private var shake: ShakeDetector? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { AppTheme { App() } }
    }

    override fun onStart() {
        super.onStart()
        TvRemote.keepAlive = true
        val app = applicationContext
        TvRemote.scope.launch { Updates.check(app) }
    }

    override fun onResume() {
        super.onResume()
        if (Store.shakeToMute.enabled) {
            shake = ShakeDetector { TvRemote.press(Keys.MUTE) }.also { it.start(this) }
        }
    }

    override fun onPause() {
        super.onPause()
        shake?.stop()
        shake = null
    }

    override fun onStop() {
        super.onStop()
        TvRemote.keepAlive = false
    }

    private fun volumeKeysToTv() = Store.volumeKeys.enabled && TvRemote.state.value.link == Link.CONNECTED

    /** Con la opción activada, los botones de volumen del móvil mandan volumen a la TV. */
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if ((keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) && volumeKeysToTv()) {
            // Al mantener pulsado, Android repite muy rápido: limitamos a ~7 pulsaciones por segundo.
            val now = System.currentTimeMillis()
            if (event.repeatCount == 0 || now - lastVolumeKey > 140) {
                lastVolumeKey = now
                TvRemote.press(if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) Keys.VOLUME_UP else Keys.VOLUME_DOWN)
            }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if ((keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) && volumeKeysToTv()) return true
        return super.onKeyUp(keyCode, event)
    }
}

/** Detecta dos sacudidas fuertes seguidas. */
private class ShakeDetector(private val onShake: () -> Unit) : SensorEventListener {
    private var manager: SensorManager? = null
    private var firstPeak = 0L
    private var lastShake = 0L

    fun start(activity: ComponentActivity) {
        val sm = activity.getSystemService(SensorManager::class.java) ?: return
        val sensor = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return
        sm.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)
        manager = sm
    }

    fun stop() {
        manager?.unregisterListener(this)
        manager = null
    }

    override fun onSensorChanged(event: SensorEvent) {
        val (x, y, z) = event.values
        val g = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH
        if (g < 2.6f) return
        val now = System.currentTimeMillis()
        if (now - lastShake < 1500) return
        if (now - firstPeak in 120..700) {
            lastShake = now
            firstPeak = 0
            onShake()
        } else {
            firstPeak = now
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}

private val BrandRed = Color(0xFFE5484D)

private val DarkColors = darkColorScheme(
    primary = BrandRed,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF5C1D21),
    onPrimaryContainer = Color(0xFFFFDAD7),
    secondary = Color(0xFF8E9BFF),
    secondaryContainer = Color(0xFF2E3150),
    onSecondaryContainer = Color(0xFFDDE0FF),
    tertiary = Color(0xFF8E9BFF),
    background = Color(0xFF101114),
    surface = Color(0xFF101114),
    surfaceVariant = Color(0xFF24262E),
    surfaceContainer = Color(0xFF1B1C22),
    surfaceContainerHigh = Color(0xFF24262E),
    surfaceContainerHighest = Color(0xFF2D2F38),
    onSurface = Color(0xFFF2F2F5),
    onSurfaceVariant = Color(0xFFB4B6C2),
)

/** Negro puro: en pantallas OLED los píxeles negros van apagados (más contraste, menos batería). */
private val AmoledColors = DarkColors.copy(
    background = Color.Black,
    surface = Color.Black,
    surfaceVariant = Color(0xFF17171A),
    surfaceContainer = Color(0xFF0D0D0F),
    surfaceContainerHigh = Color(0xFF17171A),
    surfaceContainerHighest = Color(0xFF212125),
)

private val LightColors = lightColorScheme(
    primary = Color(0xFFD6363C),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDAD7),
    onPrimaryContainer = Color(0xFF410005),
    secondary = Color(0xFF4B5BD6),
    secondaryContainer = Color(0xFFDFE0FF),
    onSecondaryContainer = Color(0xFF0F1A6B),
    tertiary = Color(0xFF4B5BD6),
    background = Color(0xFFF5F5F8),
    surface = Color(0xFFF5F5F8),
    surfaceVariant = Color(0xFFE6E6EC),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerHigh = Color(0xFFEDEDF2),
    surfaceContainerHighest = Color(0xFFE2E2E9),
    onSurface = Color(0xFF16171B),
    onSurfaceVariant = Color(0xFF5B5E6B),
)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val dynamic by Store.dynamicColor.value.collectAsState()
    val mode by Store.themeMode.collectAsState()
    val context = LocalContext.current
    val dark = when (mode) {
        Store.ThemeMode.LIGHT -> false
        Store.ThemeMode.SYSTEM -> isSystemInDarkTheme()
        else -> true
    }
    val colors = when {
        dynamic && dark -> dynamicDarkColorScheme(context).let {
            if (mode == Store.ThemeMode.AMOLED) it.copy(background = Color.Black, surface = Color.Black) else it
        }
        dynamic -> dynamicLightColorScheme(context)
        mode == Store.ThemeMode.AMOLED -> AmoledColors
        dark -> DarkColors
        else -> LightColors
    }
    // Iconos de la barra de estado claros u oscuros según el tema de la app (no el del sistema).
    val activity = context as? ComponentActivity
    LaunchedEffect(dark) {
        activity?.enableEdgeToEdge(
            statusBarStyle = if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
            navigationBarStyle = if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
        )
    }
    MaterialTheme(colorScheme = colors, content = content)
}

/** Rojo de la marca del tema actual (el tema claro usa uno algo más oscuro para que contraste). */
val Accent: Color
    @Composable get() = MaterialTheme.colorScheme.primary

private data class Tab(val label: String, val icon: Int)

private val tabs = listOf(
    Tab("Mando", R.drawable.ic_remote),
    Tab("Apps", R.drawable.ic_apps),
    Tab("Escenas", R.drawable.ic_scenes),
    Tab("Horarios", R.drawable.ic_auto),
    Tab("Ajustes", R.drawable.ic_tv),
)

@Composable
private fun App() {
    val onboardingDone by Store.onboardingDone.value.collectAsState()
    val keepScreenOn by Store.keepScreenOn.value.collectAsState()
    val view = LocalView.current
    DisposableEffect(keepScreenOn) {
        view.keepScreenOn = keepScreenOn
        onDispose { view.keepScreenOn = false }
    }

    if (!onboardingDone) {
        Onboarding(onFinish = {})
        return
    }

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
                            indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                        ),
                    )
                }
            }
        },
    ) { padding ->
        AnimatedContent(
            tab,
            transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(120)) },
            modifier = Modifier.fillMaxSize().padding(padding),
            label = "tabs",
        ) { current ->
            Box(Modifier.fillMaxSize()) {
                when (current) {
                    0 -> RemoteScreen(onOpenSettings = { tab = 4 }, onOpenApps = { tab = 1 })
                    1 -> AppsScreen()
                    2 -> ScenesScreen()
                    3 -> SchedulesScreen()
                    else -> SettingsScreen()
                }
            }
        }
        VolumeHud(Modifier.padding(padding).padding(top = 8.dp).fillMaxWidth().wrapContentWidth())
    }
}

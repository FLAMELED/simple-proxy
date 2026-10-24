package com.mdl.tclremote.ui

import android.content.Context
import android.graphics.BitmapFactory
import android.view.HapticFeedbackConstants
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mdl.tclremote.atv.DebugLog
import com.mdl.tclremote.data.AppShortcut
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/** Mosaico de respaldo: color de la marca y una inicial o símbolo. */
private data class Tile(val color: Color, val text: String, val textColor: Color = Color.White)

private data class KnownApp(val keyword: String, val iconPackage: String, val tile: Tile)

/**
 * Apps conocidas. El paquete del icono es el de la app del móvil: tiene el mismo logo y su ficha en
 * Google Play es pública (algunas versiones de TV no tienen ficha web).
 */
private val known = listOf(
    KnownApp("youtube", "com.google.android.youtube", Tile(Color(0xFFFF0000), "▶")),
    KnownApp("netflix", "com.netflix.mediaclient", Tile(Color(0xFF000000), "N", Color(0xFFE50914))),
    KnownApp("prime", "com.amazon.avod.thirdpartyclient", Tile(Color(0xFF00A8E1), "prime")),
    KnownApp("disney", "com.disney.disneyplus", Tile(Color(0xFF0E1A5C), "D+")),
    KnownApp("max", "com.wbd.stream", Tile(Color(0xFF002BE7), "max")),
    KnownApp("hbo", "com.wbd.stream", Tile(Color(0xFF002BE7), "max")),
    KnownApp("spotify", "com.spotify.music", Tile(Color(0xFF1DB954), "♫", Color.Black)),
    KnownApp("plex", "com.plexapp.android", Tile(Color(0xFF1F1F1F), "›", Color(0xFFE5A00D))),
    KnownApp("twitch", "tv.twitch.android.app", Tile(Color(0xFF9146FF), "T")),
    KnownApp("crunchyroll", "com.crunchyroll.crunchyroid", Tile(Color(0xFFF47521), "C")),
    KnownApp("vix", "com.univision.prendetv", Tile(Color(0xFFFF5000), "ViX")),
    KnownApp("paramount", "com.cbs.app", Tile(Color(0xFF0064FF), "P+")),
    KnownApp("apple", "com.apple.atve.androidtv.appletv", Tile(Color(0xFF000000), "tv")),
)

private fun knownFor(app: AppShortcut): KnownApp? {
    val haystack = (app.name + " " + app.link).lowercase()
    return known.firstOrNull { it.keyword in haystack }
}

private fun tileFor(app: AppShortcut): Tile = knownFor(app)?.tile ?: run {
    val palette = listOf(0xFF5B5BD6, 0xFF0090FF, 0xFF12A594, 0xFFE54666, 0xFFF76B15, 0xFF8E4EC6)
    Tile(Color(palette[Math.floorMod(app.name.hashCode(), palette.size)]), app.name.take(1).uppercase())
}

/** Paquete del que sacar el icono: el de la app conocida, o el de un enlace market://launch?id=… */
private fun iconPackage(app: AppShortcut): String? =
    knownFor(app)?.iconPackage ?: app.link.substringAfter("id=", "").takeIf { app.link.startsWith("market://") && it.isNotBlank() }

/** Descarga el icono desde la ficha de Google Play y lo guarda en caché en el móvil. */
object AppIcons {
    private val memory = mutableMapOf<String, ImageBitmap?>()
    private val mutex = Mutex()

    /** Cambia al borrar la caché para que los iconos en pantalla se vuelvan a cargar. */
    val generation = MutableStateFlow(0)

    fun cached(pkg: String): ImageBitmap? = memory[pkg]

    suspend fun load(context: Context, pkg: String): ImageBitmap? = mutex.withLock {
        if (memory.containsKey(pkg)) return@withLock memory[pkg]
        val bitmap = withContext(Dispatchers.IO) {
            val file = File(File(context.cacheDir, "app-icons").apply { mkdirs() }, "$pkg.png")
            val bytes = if (file.exists() && file.length() > 0) file.readBytes()
            else runCatching { download(pkg) }
                .onFailure { DebugLog.log("Icono de $pkg no disponible: ${it.message}") }
                .getOrNull()
                ?.also { file.writeBytes(it) }
            bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() }
        }
        memory[pkg] = bitmap
        bitmap
    }

    suspend fun clear(context: Context) {
        mutex.withLock {
            memory.clear()
            withContext(Dispatchers.IO) { File(context.cacheDir, "app-icons").deleteRecursively() }
        }
        generation.value++
    }

    private fun download(pkg: String): ByteArray {
        val page = fetch("https://play.google.com/store/apps/details?id=$pkg&hl=en").toString(Charsets.UTF_8)
        val url = iconUrl(page) ?: throw IllegalStateException("no se encontró el icono en Google Play")
        return fetch(url)
    }

    /** El icono es la imagen con alt="Icon image"; si no aparece, se usa og:image. */
    internal fun iconUrl(html: String): String? {
        val img = Regex("<img[^>]*>").findAll(html).map { it.value }
            .firstOrNull { "alt=\"Icon image\"" in it }
            ?.let { Regex("src=\"([^\"]+)\"").find(it)?.groupValues?.get(1) }
        val og = Regex("<meta[^>]*property=\"og:image\"[^>]*content=\"([^\"]+)\"").find(html)?.groupValues?.get(1)
        val raw = (img ?: og)?.replace("&amp;", "&") ?: return null
        // Las imágenes de play-lh aceptan el tamaño tras "=": pedimos 192 px cuadrados.
        return if ("googleusercontent.com" in raw) raw.substringBefore('=') + "=s192" else raw
    }

    private fun fetch(url: String): ByteArray {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36")
        conn.setRequestProperty("Accept-Language", "en")
        try {
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            return conn.inputStream.use { it.readBytes() }
        } finally {
            conn.disconnect()
        }
    }
}

@Composable
fun AppIcon(app: AppShortcut, size: Int) {
    val context = LocalContext.current
    val pkg = remember(app) { iconPackage(app) }
    val generation by AppIcons.generation.collectAsState()
    var bitmap by remember(pkg, generation) { mutableStateOf(pkg?.let(AppIcons::cached)) }
    LaunchedEffect(pkg, generation) {
        if (pkg != null && bitmap == null) bitmap = AppIcons.load(context, pkg)
    }
    val tile = remember(app) { tileFor(app) }
    Box(
        Modifier.size(size.dp).clip(RoundedCornerShape((size * 0.24f).dp)).background(tile.color),
        contentAlignment = Alignment.Center,
    ) {
        val image = bitmap
        if (image != null) {
            Image(image, app.name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        } else {
            Text(
                tile.text,
                color = tile.textColor,
                fontWeight = FontWeight.Bold,
                fontSize = (if (tile.text.length > 2) size * 0.24f else size * 0.42f).sp,
                maxLines = 1,
            )
        }
    }
}

/** Cuadrícula de apps: icono grande con el nombre debajo, 4 por fila. */
@Composable
fun AppGrid(apps: List<AppShortcut>, onOpen: (AppShortcut) -> Unit) {
    val view = LocalView.current
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        apps.chunked(4).forEach { row ->
            Row(Modifier.fillMaxWidth()) {
                row.forEach { app ->
                    Column(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .clickable {
                                view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                                onOpen(app)
                            },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Spacer(Modifier.height(4.dp))
                        AppIcon(app, 56)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            app.name,
                            style = MaterialTheme.typography.labelMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.width(72.dp),
                        )
                        Spacer(Modifier.height(4.dp))
                    }
                }
                repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

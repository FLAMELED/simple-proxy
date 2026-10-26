package com.mdl.tclremote.ui

import android.content.Context
import android.graphics.BitmapFactory
import android.view.HapticFeedbackConstants
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.Brush
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
import com.mdl.tclremote.data.Store
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
/** Color de la marca de la app (para tarjetas y mosaicos). */
fun brandColor(app: AppShortcut): Color = tileFor(app).color

fun iconPackage(app: AppShortcut): String? =
    app.icon.ifBlank { null } ?: knownFor(app)?.iconPackage ?: app.link.substringAfter("id=", "").takeIf { app.link.startsWith("market://") && it.isNotBlank() }

/** Apps de TV cuyo paquete no coincide con un enlace market:// de la lista (se abren por https o esquema propio). */
private val tvPackageNames = mapOf(
    "com.netflix.ninja" to ("Netflix" to "com.netflix.mediaclient"),
    "com.google.android.youtube.tv" to ("YouTube" to "com.google.android.youtube"),
    "com.amazon.amazonvideo.livingroom" to ("Prime Video" to "com.amazon.avod.thirdpartyclient"),
    "com.disney.disneyplus" to ("Disney+" to "com.disney.disneyplus"),
    "com.spotify.tv.android" to ("Spotify" to "com.spotify.music"),
)

/** Paquetes de la pantalla de inicio de la TV: no se muestran como «app abierta». */
private val launcherPackages = setOf(
    "com.google.android.apps.tv.launcherx", "com.google.android.tvlauncher", "com.tcl.waterfall.overseas.launcher",
)

/**
 * Traduce el paquete que informa la TV a una app de la lista (para mostrar nombre e icono).
 * Devuelve null para la pantalla de inicio.
 */
fun appForPackage(pkg: String): AppShortcut? {
    if (pkg in launcherPackages || "launcher" in pkg) return null
    Store.apps.value.firstOrNull { it.link.endsWith("id=$pkg") }?.let { return it }
    tvPackageNames[pkg]?.let { (name, icon) ->
        return Store.apps.value.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: AppShortcut(name, "market://launch?id=$pkg", icon)
    }
    val label = pkg.substringAfterLast('.').replaceFirstChar { it.uppercase() }
    return AppShortcut(label, "market://launch?id=$pkg")
}

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

/**
 * Cuadrícula de apps: icono grande con el nombre debajo, 4 por fila.
 * En modo [ordering], tocar una app la selecciona y tocar otra posición la mueve allí.
 */
@Composable
@OptIn(ExperimentalFoundationApi::class)
fun AppGrid(
    apps: List<AppShortcut>,
    onOpen: (AppShortcut) -> Unit,
    ordering: Boolean = false,
    columns: Int = 4,
    /** Mosaicos anchos sobre el color de la marca, como «Tus apps» en la TV. */
    banners: Boolean = false,
) {
    val view = LocalView.current
    val favorites by Store.favorites.collectAsState()
    var selected by remember(ordering) { mutableStateOf<Int?>(null) }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        apps.chunked(columns).forEachIndexed { rowIndex, row ->
            Row(Modifier.fillMaxWidth()) {
                row.forEachIndexed { col, app ->
                    val index = rowIndex * columns + col
                    Column(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (ordering && selected == index) Accent.copy(alpha = 0.3f) else Color.Transparent)
                            .combinedClickable(
                                onClick = {
                                    view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                                    if (!ordering) {
                                        onOpen(app)
                                    } else {
                                        val from = selected
                                        if (from == null) {
                                            selected = index
                                        } else {
                                            Store.moveApp(from, index)
                                            selected = null
                                        }
                                    }
                                },
                                onLongClick = {
                                    view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                                    Store.toggleFavorite(app)
                                },
                            ),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Spacer(Modifier.height(4.dp))
                        Box(
                            if (banners) {
                                Modifier
                                    .padding(horizontal = 4.dp)
                                    .fillMaxWidth()
                                    .aspectRatio(1.6f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Brush.linearGradient(listOf(brandColor(app), brandColor(app).copy(alpha = 0.55f))))
                            } else {
                                Modifier
                            },
                            contentAlignment = Alignment.Center,
                        ) {
                            AppIcon(app, if (banners) 40 else 56)
                            if (app.link in favorites) {
                                Text(
                                    "★",
                                    color = Color(0xFFFFC53D),
                                    fontSize = 14.sp,
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .background(Color(0xCC101114), RoundedCornerShape(50))
                                        .padding(horizontal = 3.dp),
                                )
                            }
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(
                            app.name,
                            style = MaterialTheme.typography.labelMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp),
                        )
                        Spacer(Modifier.height(4.dp))
                    }
                }
                repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

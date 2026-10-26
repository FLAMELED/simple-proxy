package com.mdl.tclremote.system

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.os.Bundle
import android.widget.Toast
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ui.iconPackage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.File

/** Accesos directos al mantener pulsado el icono de la app: encender, silenciar y tus favoritas. */
object Shortcuts {
    fun update(context: Context) {
        val sm = context.getSystemService(ShortcutManager::class.java) ?: return
        val fixed = listOf(
            shortcut(context, "power", "Encender/apagar TV", "power", Icon.createWithResource(context, R.drawable.ic_shortcut_power)),
            shortcut(context, "mute", "Silenciar TV", "mute", Icon.createWithResource(context, R.drawable.ic_shortcut_mute)),
        )
        val apps = Store.favoriteApps().take((sm.maxShortcutCountPerActivity - fixed.size).coerceIn(0, 2)).map { app ->
            shortcut(context, "app_${app.link.hashCode()}", app.name, "app:${app.link}", appIcon(context, iconPackage(app)))
        }
        runCatching { sm.dynamicShortcuts = fixed + apps }
    }

    private fun appIcon(context: Context, pkg: String?): Icon {
        val file = pkg?.let { File(File(context.cacheDir, "app-icons"), "$it.png") }
        val bitmap = file?.takeIf { it.exists() }?.let { BitmapFactory.decodeFile(it.path) }
        return if (bitmap != null) Icon.createWithBitmap(bitmap) else Icon.createWithResource(context, R.drawable.ic_shortcut_apps)
    }

    private fun shortcut(context: Context, id: String, label: String, command: String, icon: Icon) =
        ShortcutInfo.Builder(context, id)
            .setShortLabel(label)
            .setIcon(icon)
            .setIntent(
                Intent(context, ShortcutActivity::class.java)
                    .setAction(Intent.ACTION_VIEW)
                    .putExtra(ShortcutActivity.EXTRA_COMMAND, command),
            )
            .build()
}

/** Actividad invisible: ejecuta la orden del acceso directo y se cierra al momento. */
class ShortcutActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Store.init(applicationContext)
        val command = intent.getStringExtra(EXTRA_COMMAND)
        if (command != null) {
            val app = applicationContext
            TvRemote.scope.launch {
                try {
                    withTimeout(12_000) { Commands.run(app, command) }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(app, e.message ?: "Sin conexión con la TV", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
        finish()
    }

    companion object {
        const val EXTRA_COMMAND = "command"
    }
}

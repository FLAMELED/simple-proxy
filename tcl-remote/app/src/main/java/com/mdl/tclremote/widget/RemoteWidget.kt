package com.mdl.tclremote.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import android.widget.Toast
import com.mdl.tclremote.R
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.work.SceneWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout

class RemoteWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        Store.init(context)
        manager.updateAppWidget(ids, views(context))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION) return
        Store.init(context)
        val command = intent.getStringExtra(EXTRA_COMMAND) ?: return
        if (command.startsWith("scene:")) {
            val id = Store.widgetScenes.value.getOrNull(command.removePrefix("scene:").toInt()) ?: return
            SceneWorker.enqueue(context, id)
            Toast.makeText(context, Store.scene(id)?.name ?: "Escena", Toast.LENGTH_SHORT).show()
            return
        }
        val pending = goAsync()
        TvRemote.scope.launch {
            try {
                withTimeout(9000) {
                    when (command) {
                        "power" -> TvRemote.togglePower(context)
                        "vol_up" -> TvRemote.key(Keys.VOLUME_UP)
                        "vol_down" -> TvRemote.key(Keys.VOLUME_DOWN)
                        "mute" -> TvRemote.key(Keys.MUTE)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, e.message ?: "Sin conexión con la TV", Toast.LENGTH_LONG).show()
                }
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val ACTION = "com.mdl.tclremote.WIDGET"
        private const val EXTRA_COMMAND = "command"

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, RemoteWidget::class.java))
            if (ids.isNotEmpty()) manager.updateAppWidget(ids, views(context))
        }

        private fun views(context: Context) = RemoteViews(context.packageName, R.layout.widget_remote).apply {
            setOnClickPendingIntent(R.id.w_power, intent(context, "power"))
            setOnClickPendingIntent(R.id.w_vol_down, intent(context, "vol_down"))
            setOnClickPendingIntent(R.id.w_mute, intent(context, "mute"))
            setOnClickPendingIntent(R.id.w_vol_up, intent(context, "vol_up"))
            listOf(R.id.w_scene0, R.id.w_scene1).forEachIndexed { i, viewId ->
                val scene = Store.widgetScenes.value.getOrNull(i)?.let(Store::scene)
                if (scene == null) {
                    setViewVisibility(viewId, View.GONE)
                } else {
                    setViewVisibility(viewId, View.VISIBLE)
                    setTextViewText(viewId, scene.name)
                    setOnClickPendingIntent(viewId, intent(context, "scene:$i"))
                }
            }
        }

        private fun intent(context: Context, command: String): PendingIntent {
            val intent = Intent(context, RemoteWidget::class.java)
                .setAction(ACTION)
                .putExtra(EXTRA_COMMAND, command)
            return PendingIntent.getBroadcast(
                context, command.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
    }
}

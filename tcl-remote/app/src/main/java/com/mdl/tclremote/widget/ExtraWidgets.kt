package com.mdl.tclremote.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.view.View
import android.widget.RemoteViews
import com.mdl.tclremote.R
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ui.AppIcons
import com.mdl.tclremote.ui.MainActivity
import com.mdl.tclremote.ui.iconPackage
import kotlinx.coroutines.launch
import com.mdl.tclremote.atv.TvRemote
import java.io.File

/** Widget 1×1: solo el botón de encendido. */
class PowerWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val views = RemoteViews(context.packageName, R.layout.widget_power).apply {
            setOnClickPendingIntent(R.id.w_power, RemoteWidget.commandIntent(context, "power"))
        }
        manager.updateAppWidget(ids, views)
    }
}

/** Widget 4×1 con las cuatro primeras apps favoritas. */
class AppsWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        Store.init(context)
        manager.updateAppWidget(ids, views(context))
        downloadMissingIcons(context)
    }

    companion object {
        private val cells = listOf(
            Triple(R.id.w_app0, R.id.w_app0_icon, R.id.w_app0_label),
            Triple(R.id.w_app1, R.id.w_app1_icon, R.id.w_app1_label),
            Triple(R.id.w_app2, R.id.w_app2_icon, R.id.w_app2_label),
            Triple(R.id.w_app3, R.id.w_app3_icon, R.id.w_app3_label),
        )

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, AppsWidget::class.java))
            if (ids.isNotEmpty()) manager.updateAppWidget(ids, views(context))
        }

        private fun iconFile(context: Context, pkg: String) = File(File(context.cacheDir, "app-icons"), "$pkg.png")

        /** Si algún icono aún no está en caché, lo descarga y vuelve a pintar el widget una vez. */
        private fun downloadMissingIcons(context: Context) {
            val missing = Store.favoriteApps().take(4).mapNotNull(::iconPackage).filterNot { iconFile(context, it).exists() }
            if (missing.isEmpty()) return
            val app = context.applicationContext
            TvRemote.scope.launch {
                missing.forEach { AppIcons.load(app, it) }
                refresh(app)
            }
        }

        private fun views(context: Context) = RemoteViews(context.packageName, R.layout.widget_apps).apply {
            val favorites = Store.favoriteApps().take(4)
            setViewVisibility(R.id.w_apps_empty, if (favorites.isEmpty()) View.VISIBLE else View.GONE)
            if (favorites.isEmpty()) {
                setOnClickPendingIntent(
                    R.id.w_apps_empty,
                    PendingIntent.getActivity(
                        context, 0, Intent(context, MainActivity::class.java),
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                    ),
                )
            }
            cells.forEachIndexed { i, (cell, icon, label) ->
                val app = favorites.getOrNull(i)
                if (app == null) {
                    setViewVisibility(cell, if (favorites.isEmpty()) View.GONE else View.INVISIBLE)
                    return@forEachIndexed
                }
                setViewVisibility(cell, View.VISIBLE)
                val bitmap = iconPackage(app)?.let { iconFile(context, it) }?.takeIf { it.exists() }
                    ?.let { BitmapFactory.decodeFile(it.path) }
                if (bitmap != null) {
                    setImageViewBitmap(icon, bitmap)
                    setViewVisibility(icon, View.VISIBLE)
                    setTextViewText(label, "")
                } else {
                    setViewVisibility(icon, View.GONE)
                    setTextViewText(label, app.name.take(2))
                }
                setContentDescription(cell, app.name)
                setOnClickPendingIntent(cell, RemoteWidget.commandIntent(context, "app:${app.link}"))
            }
        }
    }
}

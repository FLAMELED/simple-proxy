package com.mdl.tclremote.system

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import com.mdl.tclremote.R
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.ui.MainActivity
import com.mdl.tclremote.widget.RemoteWidget

/** Notificación con botones de mando: visible en la cortina y en la pantalla de bloqueo. */
object ControlNotification {
    private const val CHANNEL = "control"
    private const val ID = 42

    fun update(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (!Store.controlNotification.enabled || !canPost(context)) {
            nm.cancel(ID)
            return
        }
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Control de la TV", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Botones para controlar la TV sin abrir la app"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            },
        )
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        fun action(icon: Int, title: String, command: String) =
            Notification.Action.Builder(Icon.createWithResource(context, icon), title, RemoteWidget.commandIntent(context, command)).build()

        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_remote)
            .setContentTitle("TCL 65C6K")
            .setContentText("Toca para abrir el mando")
            .setContentIntent(open)
            .setOngoing(true)
            .setShowWhen(false)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(action(R.drawable.ic_power, "Encender/apagar", "power"))
            .addAction(action(R.drawable.ic_vol_down, "Bajar volumen", "vol_down"))
            .addAction(action(R.drawable.ic_play_pause, "Play/pausa", "play_pause"))
            .addAction(action(R.drawable.ic_vol_up, "Subir volumen", "vol_up"))
            .addAction(action(R.drawable.ic_mute, "Silencio", "mute"))
            .setStyle(Notification.MediaStyle().setShowActionsInCompactView(0, 2, 3))
            .build()
        nm.notify(ID, notification)
    }

    private fun canPost(context: Context) = Build.VERSION.SDK_INT < 33 ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
}

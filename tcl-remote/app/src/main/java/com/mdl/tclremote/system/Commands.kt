package com.mdl.tclremote.system

import android.content.Context
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.TvRemote

/** Órdenes en texto que comparten widgets, notificación y accesos directos ("power", "app:<enlace>"...). */
object Commands {
    suspend fun run(context: Context, command: String) {
        when {
            command == "power" -> TvRemote.togglePower(context)
            command == "power_on" -> TvRemote.powerOn(context)
            command == "power_off" -> TvRemote.powerOff()
            command == "vol_up" -> TvRemote.key(Keys.VOLUME_UP)
            command == "vol_down" -> TvRemote.key(Keys.VOLUME_DOWN)
            command == "mute" -> TvRemote.key(Keys.MUTE)
            command == "play_pause" -> TvRemote.key(Keys.MEDIA_PLAY_PAUSE)
            command.startsWith("app:") -> TvRemote.openApp(command.removePrefix("app:"))
        }
    }
}

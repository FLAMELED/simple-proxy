package com.mdl.tclremote.system

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import com.mdl.tclremote.atv.Keys
import com.mdl.tclremote.atv.Link
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** Pausa la TV al sonar una llamada y la reanuda al colgar (si fue esta app quien la pausó). */
class PhoneCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        Store.init(context)
        if (!Store.pauseOnCall.enabled || !Store.paired.value) return
        val prefs = Store.prefs
        val pausedByUs = prefs.getBoolean(KEY_PAUSED, false)
        when (intent.getStringExtra(TelephonyManager.EXTRA_STATE)) {
            TelephonyManager.EXTRA_STATE_RINGING, TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                if (pausedByUs) return
                run(goAsync()) {
                    TvRemote.connection()
                    if (TvRemote.state.value.link == Link.CONNECTED && TvRemote.state.value.power != false) {
                        TvRemote.key(Keys.MEDIA_PAUSE)
                        prefs.edit().putBoolean(KEY_PAUSED, true).apply()
                    }
                }
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                if (!pausedByUs) return
                prefs.edit().putBoolean(KEY_PAUSED, false).apply()
                run(goAsync()) { TvRemote.key(Keys.MEDIA_PLAY) }
            }
        }
    }

    private fun run(pending: PendingResult, block: suspend () -> Unit) {
        TvRemote.scope.launch {
            try {
                withTimeout(9000) { block() }
            } catch (_: Exception) {
                // La TV puede estar apagada: no hay nada que pausar.
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        const val KEY_PAUSED = "paused_by_call"
    }
}

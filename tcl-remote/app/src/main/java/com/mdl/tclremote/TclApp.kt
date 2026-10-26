package com.mdl.tclremote

import android.app.Application
import com.mdl.tclremote.atv.Identity
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.system.ControlNotification
import com.mdl.tclremote.system.HomeArrival
import com.mdl.tclremote.system.Shortcuts
import com.mdl.tclremote.widget.AppsWidget
import com.mdl.tclremote.work.Scheduler
import com.mdl.tclremote.work.SleepTimer
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

class TclApp : Application() {
    @OptIn(FlowPreview::class)
    override fun onCreate() {
        super.onCreate()
        Identity.init(this)
        Store.init(this)
        Scheduler.rescheduleAll(this)
        SleepTimer.restore(this)
        ControlNotification.update(this)
        HomeArrival.sync(this)
        // Widgets de apps y accesos directos siguen a la lista de apps y a las favoritas.
        TvRemote.scope.launch {
            combine(Store.apps, Store.favorites) { _, _ -> Unit }.debounce(500).collect {
                runCatching { AppsWidget.refresh(this@TclApp) }
                runCatching { Shortcuts.update(this@TclApp) }
            }
        }
    }
}

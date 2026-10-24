package com.mdl.tclremote

import android.app.Application
import com.mdl.tclremote.atv.Identity
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.work.Scheduler

class TclApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Identity.init(this)
        Store.init(this)
        Scheduler.rescheduleAll(this)
    }
}

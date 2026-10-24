package com.mdl.tclremote

import android.app.Application
import com.mdl.tclremote.data.Store
import com.mdl.tclremote.work.Scheduler

class TclApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Store.init(this)
        Scheduler.rescheduleAll(this)
    }
}

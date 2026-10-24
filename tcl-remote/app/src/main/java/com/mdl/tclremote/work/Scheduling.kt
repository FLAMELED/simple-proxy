package com.mdl.tclremote.work

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.mdl.tclremote.atv.TvRemote
import com.mdl.tclremote.data.Schedule
import com.mdl.tclremote.data.Store
import java.util.Calendar

object Scheduler {
    private const val EXTRA_SCHEDULE = "schedule"

    /** Próxima vez (ms) que toca el horario a partir de [now]. */
    fun nextTrigger(schedule: Schedule, now: Long = System.currentTimeMillis()): Long {
        val cal = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, schedule.hour)
            set(Calendar.MINUTE, schedule.minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        repeat(8) {
            if (cal.timeInMillis > now &&
                (schedule.days.isEmpty() || cal.get(Calendar.DAY_OF_WEEK) in schedule.days)
            ) return cal.timeInMillis
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return cal.timeInMillis
    }

    private fun pendingIntent(context: Context, schedule: Schedule): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).putExtra(EXTRA_SCHEDULE, schedule.id)
        return PendingIntent.getBroadcast(
            context, schedule.id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    fun cancel(context: Context, schedule: Schedule) {
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, schedule))
    }

    fun schedule(context: Context, schedule: Schedule) {
        cancel(context, schedule)
        if (!schedule.enabled) return
        val am = context.getSystemService(AlarmManager::class.java)
        val at = nextTrigger(schedule)
        val pi = pendingIntent(context, schedule)
        if (am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            am.setWindow(AlarmManager.RTC_WAKEUP, at, 60_000, pi)
        }
    }

    fun rescheduleAll(context: Context) {
        Store.init(context)
        Store.schedules.value.forEach { schedule(context, it) }
    }

    fun scheduleIdFrom(intent: Intent): String? = intent.getStringExtra(EXTRA_SCHEDULE)
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Store.init(context)
        val schedule = Scheduler.scheduleIdFrom(intent)?.let(Store::schedule) ?: return
        SceneWorker.enqueue(context, schedule.sceneId)
        Scheduler.schedule(context, schedule)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Scheduler.rescheduleAll(context)
    }
}

/** Ejecuta una escena en segundo plano (horarios y botones de escena del widget). */
class SceneWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        Store.init(applicationContext)
        val scene = inputData.getString(KEY_SCENE)?.let(Store::scene) ?: return Result.failure()
        return try {
            TvRemote.runScene(applicationContext, scene)
            Result.success()
        } catch (e: Exception) {
            TvRemote.notify("“${scene.name}” falló: ${e.message}")
            if (runAttemptCount < 2) Result.retry() else Result.failure()
        }
    }

    companion object {
        private const val KEY_SCENE = "scene"

        fun enqueue(context: Context, sceneId: String) {
            val request = OneTimeWorkRequestBuilder<SceneWorker>()
                .setInputData(workDataOf(KEY_SCENE to sceneId))
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}

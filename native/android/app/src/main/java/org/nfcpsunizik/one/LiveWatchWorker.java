package org.nfcpsunizik.one;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.TimeUnit;

public final class LiveWatchWorker extends Worker {
    static final String EXTRA_OPEN_LIVE = "nfcps_open_live";
    static final String EXTRA_LIVE_URL = "nfcps_live_url";
    static final String EXTRA_LIVE_TITLE = "nfcps_live_title";
    static final String EXTRA_LIVE_CREATOR = "nfcps_live_creator";
    static final String EXTRA_LIVE_PLATFORM = "nfcps_live_platform";

    private static final String CHANNEL_ID = "nfcps_live_watch";
    private static final String PREFS = "nfcps-live-watch-v1";
    private static final String LAST_NOTIFIED = "last_notified_key";
    private static final String PERIODIC_NAME = "nfcps-trusted-live-watch";
    private static final String STARTUP_NAME = "nfcps-trusted-live-watch-startup";

    public LiveWatchWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            LiveWatchRepository.LiveItem live = LiveWatchRepository.fetchLive();
            if (live == null) return Result.success();

            SharedPreferences preferences = getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String key = live.notificationKey();
            if (key.equals(preferences.getString(LAST_NOTIFIED, ""))) return Result.success();

            if (!canNotify(getApplicationContext())) return Result.success();
            createChannel(getApplicationContext());

            Intent open = new Intent(getApplicationContext(), MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtra(EXTRA_OPEN_LIVE, true);
            open.putExtra(EXTRA_LIVE_URL, live.watchUrl());
            open.putExtra(EXTRA_LIVE_TITLE, live.title);
            open.putExtra(EXTRA_LIVE_CREATOR, live.creator);
            open.putExtra(EXTRA_LIVE_PLATFORM, live.platform);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    getApplicationContext(),
                    Math.abs(key.hashCode()),
                    open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String title = "🔴 " + live.creator + " is live";
            String body = live.manualOverride
                    ? "Live test detected for NFCPS Watch. Tap to watch now."
                    : "Tap to watch now inside NFCPS One.";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                    .setSmallIcon(R.drawable.nfcps_logo)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_EVENT)
                    .setAutoCancel(true)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat.from(getApplicationContext()).notify(Math.abs(key.hashCode()), builder.build());
            preferences.edit().putString(LAST_NOTIFIED, key).apply();
            return Result.success();
        } catch (Exception ignored) {
            return Result.retry();
        }
    }

    static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(
                LiveWatchWorker.class,
                15,
                TimeUnit.MINUTES
        ).setConstraints(constraints).build();

        WorkManager manager = WorkManager.getInstance(context.getApplicationContext());
        manager.enqueueUniquePeriodicWork(PERIODIC_NAME, ExistingPeriodicWorkPolicy.UPDATE, periodic);

        OneTimeWorkRequest startup = new OneTimeWorkRequest.Builder(LiveWatchWorker.class)
                .setConstraints(constraints)
                .build();
        manager.enqueueUniqueWork(STARTUP_NAME, ExistingWorkPolicy.REPLACE, startup);
    }

    private static boolean canNotify(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "NFCPS Watch live",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alerts when a trusted Christian source goes live in NFCPS Watch.");
        manager.createNotificationChannel(channel);
    }
}

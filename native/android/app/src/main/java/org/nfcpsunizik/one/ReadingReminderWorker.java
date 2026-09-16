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
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

public final class ReadingReminderWorker extends Worker {
    private static final String CHANNEL_ID = "nfcps_reading_companion";
    private static final String CHANNEL_NAME = "NFCPS Reading companion";
    private static final String PREFS = "nfcps-reading-reminders-v1";
    private static final String DATA_TOKEN = "token";
    private static final String DATA_KIND = "kind";
    private static final String KIND_DAILY = "daily";
    private static final String KIND_DUE_7 = "due7";
    private static final String KIND_DUE_2 = "due2";
    private static final String KIND_DUE = "due";
    private static final String KIND_OVERDUE = "overdue";
    private static final String API_BASE = "https://nfcps-one.hatchable.site/api/circulation/";

    private static final String[] DAILY_TITLES = new String[] {
            "How's your reading going? 📖",
            "A few pages today?",
            "Make room for what matters.",
            "Read. Reflect. Grow. 🌱",
            "Your book is waiting.",
            "A quiet reading moment?",
            "What has stood out so far?",
            "Carry something from the page.",
            "Keep the thought going.",
            "One page still counts."
    };

    private static final String[] DAILY_BODIES = new String[] {
            "Even a few pages today can leave something with you.",
            "Ten quiet minutes might be all you need today.",
            "What is one idea from this book worth remembering?",
            "Don't just finish the book — carry something from it.",
            "Your reading streak does not need to be perfect. A page today still counts.",
            "Take a few quiet minutes and return to what you were learning.",
            "What is God teaching you through what you are reading?",
            "Pause, read a little, and keep one useful thought with you.",
            "Open your book again today and keep the journey moving.",
            "A small reading habit can become lasting formation."
    };

    public ReadingReminderWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        String token = clean(getInputData().getString(DATA_TOKEN));
        String kind = clean(getInputData().getString(DATA_KIND));
        if (token.isEmpty() || !isEnabled(getApplicationContext(), token)) return Result.success();

        LoanSnapshot snapshot = refreshLoan(token);
        if (snapshot.closed) {
            disable(getApplicationContext(), token);
            return Result.success();
        }
        if (!snapshot.title.isEmpty()) put(getApplicationContext(), key("title", token), snapshot.title);
        if (!snapshot.dueAt.isEmpty()) {
            String previous = get(getApplicationContext(), key("due", token));
            if (!snapshot.dueAt.equals(previous)) {
                put(getApplicationContext(), key("due", token), snapshot.dueAt);
                scheduleDueWork(getApplicationContext(), token, snapshot.dueAt);
            }
        }

        String title = get(getApplicationContext(), key("title", token));
        String dueAt = get(getApplicationContext(), key("due", token));
        if (title.isEmpty()) title = "Your NFCPS book";

        if (KIND_DAILY.equals(kind)) {
            String today = localDayKey();
            if (today.equals(get(getApplicationContext(), key("lastDaily", token)))) return Result.success();
            int seed = Math.abs((token + today).hashCode());
            String heading = DAILY_TITLES[seed % DAILY_TITLES.length];
            String body = DAILY_BODIES[(seed / 7) % DAILY_BODIES.length] + "\n" + title;
            notify(getApplicationContext(), token + ":daily:" + today, heading, body);
            put(getApplicationContext(), key("lastDaily", token), today);
            return Result.success();
        }

        long dueMillis = parseIso(dueAt);
        long days = dueMillis > 0 ? (dueMillis - System.currentTimeMillis()) / TimeUnit.DAYS.toMillis(1) : Long.MAX_VALUE;
        if (KIND_DUE_7.equals(kind)) {
            notify(getApplicationContext(), token + ":due7", "One week left 📚", "You have about 7 days to return “" + title + "”. Keep enjoying the read.");
        } else if (KIND_DUE_2.equals(kind)) {
            notify(getApplicationContext(), token + ":due2", "Two days to return your book", "“" + title + "” is due soon. Finish well and plan the return.");
        } else if (KIND_DUE.equals(kind)) {
            notify(getApplicationContext(), token + ":due", "Return day · NFCPS Library", "“" + title + "” is due today. Tap to open NFCPS One.");
        } else if (KIND_OVERDUE.equals(kind) && days < 0) {
            String date = localDayKey();
            notify(getApplicationContext(), token + ":overdue:" + date, "Book return reminder", "“" + title + "” is overdue. Please return it so another student can read it too.");
        }
        return Result.success();
    }

    public static synchronized boolean enable(Context context, String token, String title, String dueAt) {
        token = clean(token);
        title = clean(title);
        dueAt = clean(dueAt);
        if (token.isEmpty()) return false;

        boolean firstEnable = !isEnabled(context, token);
        put(context, key("enabled", token), "1");
        put(context, key("title", token), title.isEmpty() ? "Your NFCPS book" : title);
        put(context, key("due", token), dueAt);
        scheduleDaily(context, token);
        scheduleDueWork(context, token, dueAt);
        if (firstEnable) {
            String safeTitle = title.isEmpty() ? "your book" : title;
            notify(context, token + ":welcome", "Good read! 📖", "Enjoy “" + safeTitle + "”. Take something worth remembering with you.");
        }
        return true;
    }

    public static synchronized void disable(Context context, String token) {
        token = clean(token);
        if (token.isEmpty()) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .remove(key("enabled", token))
                .remove(key("title", token))
                .remove(key("due", token))
                .remove(key("lastDaily", token))
                .apply();
        WorkManager manager = WorkManager.getInstance(context.getApplicationContext());
        manager.cancelUniqueWork(work("daily", token));
        manager.cancelUniqueWork(work("due7", token));
        manager.cancelUniqueWork(work("due2", token));
        manager.cancelUniqueWork(work("due", token));
        manager.cancelUniqueWork(work("overdue", token));
    }

    public static boolean isEnabled(Context context, String token) {
        return "1".equals(get(context, key("enabled", clean(token))));
    }

    private static void scheduleDaily(Context context, String token) {
        long delay = delayUntilLocalHour(19);
        Data data = new Data.Builder().putString(DATA_TOKEN, token).putString(DATA_KIND, KIND_DAILY).build();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(ReadingReminderWorker.class, 24, TimeUnit.HOURS)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setInputData(data)
                .build();
        WorkManager.getInstance(context.getApplicationContext()).enqueueUniquePeriodicWork(
                work("daily", token), ExistingPeriodicWorkPolicy.UPDATE, request
        );
    }

    private static void scheduleDueWork(Context context, String token, String dueAt) {
        long due = parseIso(dueAt);
        if (due <= 0) return;
        WorkManager manager = WorkManager.getInstance(context.getApplicationContext());
        enqueueOnce(manager, token, KIND_DUE_7, work("due7", token), due - TimeUnit.DAYS.toMillis(7));
        enqueueOnce(manager, token, KIND_DUE_2, work("due2", token), due - TimeUnit.DAYS.toMillis(2));
        enqueueOnce(manager, token, KIND_DUE, work("due", token), due);

        Data overdueData = new Data.Builder().putString(DATA_TOKEN, token).putString(DATA_KIND, KIND_OVERDUE).build();
        long overdueStart = Math.max(0, due + TimeUnit.DAYS.toMillis(3) - System.currentTimeMillis());
        PeriodicWorkRequest overdue = new PeriodicWorkRequest.Builder(ReadingReminderWorker.class, 3, TimeUnit.DAYS)
                .setInitialDelay(overdueStart, TimeUnit.MILLISECONDS)
                .setInputData(overdueData)
                .build();
        manager.enqueueUniquePeriodicWork(work("overdue", token), ExistingPeriodicWorkPolicy.UPDATE, overdue);
    }

    private static void enqueueOnce(WorkManager manager, String token, String kind, String uniqueName, long targetMillis) {
        long delay = Math.max(0, targetMillis - System.currentTimeMillis());
        Data data = new Data.Builder().putString(DATA_TOKEN, token).putString(DATA_KIND, kind).build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(ReadingReminderWorker.class)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setInputData(data)
                .build();
        manager.enqueueUniqueWork(uniqueName, ExistingWorkPolicy.REPLACE, request);
    }

    private LoanSnapshot refreshLoan(String token) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(API_BASE + token).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(3500);
            connection.setReadTimeout(4500);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "NFCPS-One/1.7 reading-companion");
            int status = connection.getResponseCode();
            if (status == 404 || status == 410) return new LoanSnapshot(true, "", "");
            if (status < 200 || status >= 300) return new LoanSnapshot(false, "", "");
            InputStream stream = connection.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
            StringBuilder json = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) json.append(line);
            JSONObject value = new JSONObject(json.toString());
            String statusValue = value.optString("status", "");
            boolean closed = "returned".equalsIgnoreCase(statusValue) || "closed".equalsIgnoreCase(statusValue);
            return new LoanSnapshot(closed, value.optString("title", ""), value.optString("dueAt", ""));
        } catch (Exception ignored) {
            return new LoanSnapshot(false, "", "");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static void notify(Context context, String key, String title, String body) {
        if (!canNotify(context)) return;
        createChannel(context);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                Math.abs(key.hashCode()),
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.nfcps_logo)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);
        NotificationManagerCompat.from(context).notify(Math.abs(key.hashCode()), builder.build());
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
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Daily reading encouragement and NFCPS Library return reminders.");
        manager.createNotificationChannel(channel);
    }

    private static long delayUntilLocalHour(int hour) {
        Calendar now = Calendar.getInstance();
        Calendar next = (Calendar) now.clone();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (!next.after(now)) next.add(Calendar.DAY_OF_YEAR, 1);
        return next.getTimeInMillis() - now.getTimeInMillis();
    }

    private static long parseIso(String raw) {
        if (raw == null || raw.isBlank()) return -1;
        String[] patterns = new String[]{"yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX"};
        for (String pattern : patterns) {
            try {
                SimpleDateFormat format = new SimpleDateFormat(pattern, Locale.US);
                format.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date date = format.parse(raw);
                if (date != null) return date.getTime();
            } catch (Exception ignored) {}
        }
        return -1;
    }

    private static String localDayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static String key(String type, String token) {
        return type + ":" + token;
    }

    private static String work(String type, String token) {
        return "nfcps-reading-" + type + "-" + Integer.toHexString(token.hashCode());
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String get(Context context, String key) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, "");
    }

    private static void put(Context context, String key, String value) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(key, value == null ? "" : value).apply();
    }

    private static final class LoanSnapshot {
        final boolean closed;
        final String title;
        final String dueAt;

        LoanSnapshot(boolean closed, String title, String dueAt) {
            this.closed = closed;
            this.title = title == null ? "" : title;
            this.dueAt = dueAt == null ? "" : dueAt;
        }
    }
}

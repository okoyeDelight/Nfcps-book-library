package org.nfcpsunizik.one;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Rare native Android update path for NFCPS One.
 *
 * Normal NFCPS product changes are delivered remotely through the web app and
 * must NOT require this updater. This class is only for changes that genuinely
 * require a new Android package.
 */
public final class UpdateManager {
    private static final String[] MANIFEST_URLS = new String[] {
            "https://raw.githubusercontent.com/okoyeDelight/Nfcps-book-library/main/nfcps-update.json",
            "https://cdn.jsdelivr.net/gh/okoyeDelight/Nfcps-book-library@main/nfcps-update.json"
    };
    private static final long MAX_APK_BYTES = 220L * 1024L * 1024L;
    private static final long MIN_APK_BYTES = 64L * 1024L;

    private final Activity activity;
    private volatile boolean checkStarted;
    private volatile boolean downloading;
    private File pendingInstall;
    private AlertDialog progressDialog;
    private ProgressBar progressBar;
    private TextView progressText;

    public UpdateManager(Activity activity) {
        this.activity = activity;
    }

    public void checkForUpdatesOnce() {
        if (checkStarted) return;
        checkStarted = true;
        new Thread(() -> {
            UpdateSpec spec = fetchSpec();
            if (spec == null || !spec.enabled) return;
            long current = installedVersionCode();
            if (current <= 0 || spec.latestVersionCode <= current) return;
            activity.runOnUiThread(() -> showUpdatePrompt(spec, current));
        }, "NFCPS-Update-Check").start();
    }

    public void onResume() {
        if (pendingInstall == null || !pendingInstall.isFile()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            return;
        }
        File file = pendingInstall;
        pendingInstall = null;
        launchInstaller(file);
    }

    private UpdateSpec fetchSpec() {
        for (String endpoint : MANIFEST_URLS) {
            HttpURLConnection connection = null;
            try {
                String separator = endpoint.contains("?") ? "&" : "?";
                connection = (HttpURLConnection) new URL(endpoint + separator + "t=" + System.currentTimeMillis()).openConnection();
                connection.setConnectTimeout(4500);
                connection.setReadTimeout(4500);
                connection.setUseCaches(false);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cache-Control", "no-cache");
                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) continue;

                StringBuilder body = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        body.append(line);
                        if (body.length() > 32_768) return null;
                    }
                }

                JSONObject json = new JSONObject(body.toString());
                boolean enabled = json.optBoolean("enabled", true);
                long latest = json.optLong("latest_version_code", 0);
                long minimum = json.optLong("minimum_supported_version_code", 0);
                String versionName = cleanText(json.optString("latest_version_name", "Update"), 64);
                String apkUrl = sanitizeHttpsUrl(json.optString("apk_url", ""));
                String sha256 = json.optString("sha256", "").trim().toLowerCase(Locale.US);
                String title = cleanText(json.optString("title", "NFCPS One update"), 120);
                String notes = cleanText(json.optString("notes", "A native NFCPS update is available."), 1800);

                if (!enabled) return new UpdateSpec(false, latest, minimum, versionName, apkUrl, sha256, title, notes);
                if (latest <= 0 || apkUrl == null || !sha256.matches("[0-9a-f]{64}")) continue;
                return new UpdateSpec(true, latest, minimum, versionName, apkUrl, sha256, title, notes);
            } catch (Exception ignored) {
                // Try the next mirror.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        return null;
    }

    private void showUpdatePrompt(UpdateSpec spec, long currentVersionCode) {
        boolean required = currentVersionCode < spec.minimumSupportedVersionCode;
        String message = spec.notes;
        if (!message.isBlank()) message += "\n\n";
        message += "Version " + spec.latestVersionName;
        if (required) {
            message += "\n\nThis Android update is required for NFCPS One to continue working correctly.";
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(activity)
                .setTitle(spec.title)
                .setMessage(message)
                .setPositiveButton("Update now", (dialog, which) -> downloadAndInstall(spec));

        if (!required) {
            builder.setNegativeButton("Later", null);
        }

        AlertDialog dialog = builder.create();
        dialog.setCancelable(!required);
        dialog.setCanceledOnTouchOutside(!required);
        dialog.show();
    }

    private void downloadAndInstall(UpdateSpec spec) {
        if (downloading) return;
        downloading = true;
        showProgress(spec.latestVersionName);

        new Thread(() -> {
            File temp = null;
            try {
                File updatesDir = new File(activity.getCacheDir(), "updates");
                if (!updatesDir.exists() && !updatesDir.mkdirs()) throw new IllegalStateException("Cannot create update cache");
                temp = new File(updatesDir, "NFCPS-One-" + spec.latestVersionCode + ".apk.part");
                File ready = new File(updatesDir, "NFCPS-One-" + spec.latestVersionCode + ".apk");
                if (temp.exists()) temp.delete();
                if (ready.exists()) ready.delete();

                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                HttpURLConnection connection = (HttpURLConnection) new URL(spec.apkUrl).openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setConnectTimeout(10_000);
                connection.setReadTimeout(35_000);
                connection.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) throw new IllegalStateException("Download failed (" + status + ")");
                long total = connection.getContentLengthLong();
                if (total > MAX_APK_BYTES) throw new IllegalStateException("Update package is too large");

                long readTotal = 0;
                int lastPercent = -1;
                try (BufferedInputStream input = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream output = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[64 * 1024];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        readTotal += count;
                        if (readTotal > MAX_APK_BYTES) throw new IllegalStateException("Update package is too large");
                        output.write(buffer, 0, count);
                        digest.update(buffer, 0, count);
                        if (total > 0) {
                            int percent = (int) Math.min(100, (readTotal * 100L) / total);
                            if (percent != lastPercent && (percent == 100 || percent - lastPercent >= 2)) {
                                lastPercent = percent;
                                int shownPercent = percent;
                                activity.runOnUiThread(() -> updateProgress(shownPercent));
                            }
                        }
                    }
                    output.flush();
                } finally {
                    connection.disconnect();
                }

                if (readTotal < MIN_APK_BYTES) throw new IllegalStateException("Downloaded update is incomplete");
                String actualHash = hex(digest.digest());
                if (!actualHash.equalsIgnoreCase(spec.sha256)) throw new SecurityException("Update integrity check failed");
                if (!temp.renameTo(ready)) {
                    copyFile(temp, ready);
                    temp.delete();
                }
                if (!isTrustedNfcpsUpdate(ready, spec.latestVersionCode)) {
                    ready.delete();
                    throw new SecurityException("Update identity check failed");
                }

                activity.runOnUiThread(() -> {
                    dismissProgress();
                    downloading = false;
                    requestInstall(ready);
                });
            } catch (Exception error) {
                if (temp != null) temp.delete();
                String message = cleanText(error.getMessage(), 240);
                if (message.isBlank()) message = "The update could not be prepared. Please try again when your connection is stable.";
                String shown = message;
                activity.runOnUiThread(() -> {
                    dismissProgress();
                    downloading = false;
                    new AlertDialog.Builder(activity)
                            .setTitle("Update not installed")
                            .setMessage(shown)
                            .setPositiveButton("OK", null)
                            .show();
                });
            }
        }, "NFCPS-Update-Download").start();
    }

    private void requestInstall(File apk) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            pendingInstall = apk;
            new AlertDialog.Builder(activity)
                    .setTitle("Allow NFCPS updates")
                    .setMessage("Android needs one permission before NFCPS One can open its signed update package. Enable “Allow from this source”, then return to NFCPS. You will still see Android's normal Update confirmation before anything is installed.")
                    .setPositiveButton("Continue", (dialog, which) -> {
                        Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + activity.getPackageName()));
                        activity.startActivity(settings);
                    })
                    .setNegativeButton("Not now", (dialog, which) -> pendingInstall = null)
                    .show();
            return;
        }
        launchInstaller(apk);
    }

    private void launchInstaller(File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(activity,
                    activity.getPackageName() + ".updateprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        } catch (Exception error) {
            new AlertDialog.Builder(activity)
                    .setTitle("Couldn’t open Android updater")
                    .setMessage("The signed NFCPS update was downloaded, but Android could not open the installer. You can try again later.")
                    .setPositiveButton("OK", null)
                    .show();
        }
    }

    private boolean isTrustedNfcpsUpdate(File apk, long expectedVersionCode) {
        try {
            PackageManager pm = activity.getPackageManager();
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                    ? PackageManager.GET_SIGNING_CERTIFICATES
                    : PackageManager.GET_SIGNATURES;
            PackageInfo candidate = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
            PackageInfo installed = pm.getPackageInfo(activity.getPackageName(), flags);
            if (candidate == null || installed == null) return false;
            if (!activity.getPackageName().equals(candidate.packageName)) return false;
            long candidateCode = versionCode(candidate);
            long installedCode = versionCode(installed);
            if (candidateCode != expectedVersionCode || candidateCode <= installedCode) return false;
            return signatureDigests(candidate).equals(signatureDigests(installed))
                    && !signatureDigests(installed).isEmpty();
        } catch (Exception ignored) {
            return false;
        }
    }

    private Set<String> signatureDigests(PackageInfo info) throws Exception {
        Signature[] signatures;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            signatures = info.signingInfo.hasMultipleSigners()
                    ? info.signingInfo.getApkContentsSigners()
                    : info.signingInfo.getSigningCertificateHistory();
        } else {
            signatures = info.signatures;
        }
        Set<String> result = new HashSet<>();
        if (signatures == null) return result;
        for (Signature signature : signatures) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            result.add(hex(digest.digest(signature.toByteArray())));
        }
        return result;
    }

    private long installedVersionCode() {
        try {
            return versionCode(activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0));
        } catch (Exception ignored) {
            return -1;
        }
    }

    private long versionCode(PackageInfo info) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
    }

    private void showProgress(String versionName) {
        LinearLayout shell = new LinearLayout(activity);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setPadding(dp(24), dp(8), dp(24), dp(8));
        shell.setGravity(Gravity.CENTER_HORIZONTAL);

        progressText = new TextView(activity);
        progressText.setText("Preparing NFCPS One " + versionName + "…");
        progressText.setTextSize(14);
        shell.addView(progressText, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        progressBar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setIndeterminate(false);
        LinearLayout.LayoutParams barParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(18));
        barParams.topMargin = dp(14);
        shell.addView(progressBar, barParams);

        progressDialog = new AlertDialog.Builder(activity)
                .setTitle("Downloading update")
                .setView(shell)
                .setCancelable(false)
                .create();
        progressDialog.show();
    }

    private void updateProgress(int percent) {
        if (progressBar != null) progressBar.setProgress(percent);
        if (progressText != null) progressText.setText("Downloading signed NFCPS update… " + percent + "%");
    }

    private void dismissProgress() {
        if (progressDialog != null) {
            progressDialog.dismiss();
            progressDialog = null;
        }
        progressBar = null;
        progressText = null;
    }

    private int dp(int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private static String sanitizeHttpsUrl(String candidate) {
        try {
            if (candidate == null || candidate.length() > 2048) return null;
            Uri uri = Uri.parse(candidate.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getHost() == null || uri.getHost().isBlank()) return null;
            if (uri.getUserInfo() != null) return null;
            return uri.toString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String cleanText(String value, int maxLength) {
        if (value == null) return "";
        String clean = value.replace('\u0000', ' ').trim();
        return clean.length() <= maxLength ? clean : clean.substring(0, maxLength);
    }

    private static String hex(byte[] bytes) {
        StringBuilder out = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) out.append(String.format(Locale.US, "%02x", value & 0xff));
        return out.toString();
    }

    private static void copyFile(File source, File target) throws Exception {
        try (FileInputStream input = new FileInputStream(source);
             FileOutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            output.flush();
        }
    }

    private static final class UpdateSpec {
        final boolean enabled;
        final long latestVersionCode;
        final long minimumSupportedVersionCode;
        final String latestVersionName;
        final String apkUrl;
        final String sha256;
        final String title;
        final String notes;

        UpdateSpec(boolean enabled, long latestVersionCode, long minimumSupportedVersionCode,
                   String latestVersionName, String apkUrl, String sha256,
                   String title, String notes) {
            this.enabled = enabled;
            this.latestVersionCode = latestVersionCode;
            this.minimumSupportedVersionCode = minimumSupportedVersionCode;
            this.latestVersionName = latestVersionName;
            this.apkUrl = apkUrl;
            this.sha256 = sha256;
            this.title = title;
            this.notes = notes;
        }
    }
}

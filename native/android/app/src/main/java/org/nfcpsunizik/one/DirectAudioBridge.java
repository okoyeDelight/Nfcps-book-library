package org.nfcpsunizik.one;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

public final class DirectAudioBridge implements DirectAudioCaptureService.Listener {
    public static final int REQUEST_RECORD_AUDIO = 7302;
    public static final int REQUEST_MEDIA_PROJECTION = 7303;

    private final Activity activity;
    private final WebView webView;
    private final String sessionToken;
    private boolean pendingStart;

    public DirectAudioBridge(Activity activity, WebView webView, String sessionToken) {
        this.activity = activity;
        this.webView = webView;
        this.sessionToken = sessionToken;
        DirectAudioCaptureService.setListener(this);
    }

    private boolean validToken(String token) {
        return sessionToken != null && sessionToken.equals(token);
    }

    @JavascriptInterface
    public boolean isSupported(String token) {
        return validToken(token) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }

    @JavascriptInterface
    public void start(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(this::requestStart);
    }

    @JavascriptInterface
    public void stop(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(activity, DirectAudioCaptureService.class);
            intent.setAction(DirectAudioCaptureService.ACTION_STOP);
            activity.startService(intent);
        });
    }

    private void requestStart() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            dispatchState("unsupported", "Direct Audio requires Android 10 or newer.", -120, 0, 0);
            return;
        }
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingStart = true;
            dispatchState(
                    "permission-required",
                    "Android requires its audio-recording permission class for playback capture. NFCPS Direct Audio captures only NFCPS media output, not microphone input.",
                    -120,
                    0,
                    0
            );
            activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
            return;
        }
        requestProjection();
    }

    private void requestProjection() {
        pendingStart = false;
        MediaProjectionManager manager = (MediaProjectionManager) activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (manager == null) {
            dispatchState("error", "Android playback capture is unavailable on this device.", -120, 0, 0);
            return;
        }
        dispatchState(
                "consent-required",
                "Approve Android's capture dialog once for this Direct Audio session. NFCPS restricts capture to its own media playback UID.",
                -120,
                0,
                0
        );
        activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
    }

    public void onPermissionResult(boolean granted) {
        activity.runOnUiThread(() -> {
            if (!pendingStart) return;
            pendingStart = false;
            if (!granted) {
                dispatchState("permission-required", "Direct Audio permission was not granted.", -120, 0, 0);
                return;
            }
            requestProjection();
        });
    }

    public void onProjectionResult(int resultCode, Intent data) {
        activity.runOnUiThread(() -> {
            if (resultCode != Activity.RESULT_OK || data == null) {
                dispatchState("stopped", "Direct Audio was not started.", -120, 0, 0);
                return;
            }
            DirectAudioCaptureService.setListener(this);
            Intent service = new Intent(activity, DirectAudioCaptureService.class);
            service.setAction(DirectAudioCaptureService.ACTION_START);
            service.putExtra(DirectAudioCaptureService.EXTRA_RESULT_CODE, resultCode);
            service.putExtra(DirectAudioCaptureService.EXTRA_RESULT_DATA, data);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) activity.startForegroundService(service);
            else activity.startService(service);
            dispatchState("starting", "Starting Direct Audio playback capture…", -120, 0, 0);
        });
    }

    @Override
    public void onState(String state, String message, double rmsDb, int peak, long frames) {
        dispatchState(state, message, rmsDb, peak, frames);
    }

    @Override
    public void onChunk(byte[] wavBytes, long captureStartMs, long durationMs, double rmsDb) {
        if (wavBytes == null || wavBytes.length == 0) return;
        String base64 = Base64.encodeToString(wavBytes, Base64.NO_WRAP);
        String script = "window.dispatchEvent(new CustomEvent('nfcps-direct-audio-chunk',{detail:{audioBase64:"
                + JSONObject.quote(base64)
                + ",captureStartMs:" + captureStartMs
                + ",durationMs:" + durationMs
                + ",rmsDb:" + String.format(java.util.Locale.US, "%.2f", rmsDb)
                + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void dispatchState(String state, String message, double rmsDb, int peak, long frames) {
        String script = "window.dispatchEvent(new CustomEvent('nfcps-direct-audio-state',{detail:{state:"
                + JSONObject.quote(state == null ? "" : state)
                + ",message:" + JSONObject.quote(message == null ? "" : message)
                + ",rmsDb:" + String.format(java.util.Locale.US, "%.2f", rmsDb)
                + ",peak:" + peak
                + ",frames:" + frames
                + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    public void destroy() {
        DirectAudioCaptureService.setListener(null);
        try {
            Intent intent = new Intent(activity, DirectAudioCaptureService.class);
            intent.setAction(DirectAudioCaptureService.ACTION_STOP);
            activity.startService(intent);
        } catch (Exception ignored) {
        }
    }
}

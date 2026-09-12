package org.nfcpsunizik.one;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

public final class NativeSpeechBridge implements RecognitionListener, DirectAudioCaptureService.Listener {
    public static final int REQUEST_RECORD_AUDIO = 7201;

    private final Activity activity;
    private final WebView webView;
    private final String sessionToken = UUID.randomUUID().toString();
    private final LocalVoskTranscriber localTranscriber;
    private final NativeScriptureLensController lensController;
    private final Runnable readDiscoveryMonitor;
    private SpeechRecognizer recognizer;
    private boolean active;
    private boolean pendingStart;
    private boolean microphoneFallback;
    private int restartGeneration;
    private long lensStartedAt;

    public NativeSpeechBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        DirectAudioCaptureService.setListener(this);
        localTranscriber = new LocalVoskTranscriber(activity, new LocalVoskTranscriber.Listener() {
            @Override
            public void onRecognizerState(String state, String message) {
                dispatchLocalAsrState(state, message);
                if ("preparing".equals(state) && lensController != null && lensController.isActive()) {
                    lensController.setStatus("Preparing Lens…");
                }
                if ("ready".equals(state) && lensController != null && lensController.isActive()) {
                    lensController.setStatus(microphoneFallback ? "Lens · mic" : "Lens listening");
                }
            }

            @Override
            public void onTranscript(String text, boolean isFinal, long startMs, long endMs) {
                dispatchSpeech(text, isFinal, startMs, endMs, "direct-audio-local");
                if (lensController != null && lensController.isActive()) {
                    lensController.analyze(text, startMs, endMs);
                }
            }
        });
        lensController = new NativeScriptureLensController(activity, webView, new NativeScriptureLensController.Controls() {
            @Override public void startLens() { startLensInternal(); }
            @Override public void stopLens() { stopLensInternal(); }
        });
        readDiscoveryMonitor = new Runnable() {
            @Override public void run() {
                NativeReadDiscoveryController.inject(webView);
                webView.postDelayed(this, 900);
            }
        };
        webView.postDelayed(readDiscoveryMonitor, 1200);
    }

    String getSessionToken() {
        return sessionToken;
    }

    private boolean validToken(String token) {
        return sessionToken.equals(token);
    }

    @JavascriptInterface
    public boolean isAvailable(String token) {
        return validToken(token) && SpeechRecognizer.isRecognitionAvailable(activity);
    }

    @JavascriptInterface
    public void start(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(this::requestStart);
    }

    @JavascriptInterface
    public void stop(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(() -> stopInternal(false));
    }

    @JavascriptInterface
    public boolean isDirectAudioSupported(String token) {
        return validToken(token) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }

    @JavascriptInterface
    public void startDirectAudio(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(() -> beginDirectAudio(true));
    }

    @JavascriptInterface
    public void stopDirectAudio(String token) {
        if (!validToken(token)) return;
        activity.runOnUiThread(this::stopDirectAudioInternal);
    }

    private void startLensInternal() {
        activity.runOnUiThread(() -> {
            lensStartedAt = System.currentTimeMillis();
            microphoneFallback = false;
            localTranscriber.resetSession();
            lensController.setActive(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) beginDirectAudio(false);
            else {
                microphoneFallback = true;
                lensController.setStatus("Lens · mic");
                requestStart();
            }
        });
    }

    private void stopLensInternal() {
        activity.runOnUiThread(() -> {
            lensController.setActive(false);
            microphoneFallback = false;
            stopDirectAudioInternal();
            stopInternal(true);
        });
    }

    private void beginDirectAudio(boolean externalRequest) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            dispatchDirectState("unsupported", "Direct Audio requires Android 10 or newer.", -120, 0, 0);
            if (!externalRequest && lensController.isActive()) {
                microphoneFallback = true;
                requestStart();
            }
            return;
        }
        localTranscriber.resetSession();
        DirectAudioCaptureService.setListener(this);
        dispatchDirectState(
                "requesting",
                "Android will ask for playback-capture consent for Scripture Lens.",
                -120,
                0,
                0
        );
        activity.startActivity(new Intent(activity, DirectAudioPermissionActivity.class));
    }

    private void stopDirectAudioInternal() {
        Intent intent = new Intent(activity, DirectAudioCaptureService.class);
        intent.setAction(DirectAudioCaptureService.ACTION_STOP);
        try { activity.startService(intent); } catch (Exception ignored) {}
    }

    public void onPermissionResult(boolean granted) {
        activity.runOnUiThread(() -> {
            if (!pendingStart) return;
            pendingStart = false;
            if (!granted) {
                active = false;
                dispatchState("permission-required", "Microphone permission is needed for Live Church Lens.");
                return;
            }
            active = true;
            startRecognizer();
        });
    }

    public void destroy() {
        activity.runOnUiThread(() -> {
            webView.removeCallbacks(readDiscoveryMonitor);
            if (lensController != null) lensController.destroy();
            if (localTranscriber != null) localTranscriber.close();
            stopInternal(true);
            if (recognizer != null) {
                recognizer.destroy();
                recognizer = null;
            }
            stopDirectAudioInternal();
            DirectAudioCaptureService.setListener(null);
        });
    }

    private void requestStart() {
        if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
            active = false;
            dispatchState("unsupported", "Android speech recognition is unavailable on this device.");
            if (lensController.isActive()) lensController.setStatus("Lens speech unavailable");
            return;
        }
        if (activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingStart = true;
            active = false;
            dispatchState("permission-required", "Allow microphone access for Live Church Lens.");
            activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
            return;
        }
        pendingStart = false;
        active = true;
        startRecognizer();
    }

    private void ensureRecognizer() {
        if (recognizer != null) return;
        recognizer = SpeechRecognizer.createSpeechRecognizer(activity);
        recognizer.setRecognitionListener(this);
    }

    private Intent recognizerIntent() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-NG");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, activity.getPackageName());
        return intent;
    }

    private void startRecognizer() {
        if (!active) return;
        try {
            ensureRecognizer();
            recognizer.startListening(recognizerIntent());
        } catch (Exception exception) {
            active = false;
            dispatchState("paused", "Live Church Lens could not start Android speech recognition. Tap Resume to try again.");
        }
    }

    private void stopInternal(boolean destroying) {
        active = false;
        pendingStart = false;
        restartGeneration += 1;
        if (recognizer != null) {
            try {
                if (destroying) recognizer.cancel();
                else recognizer.stopListening();
            } catch (Exception ignored) {
            }
        }
        if (!destroying) dispatchState("paused", "Live Church Lens paused.");
    }

    private void scheduleRestart(long delayMs) {
        if (!active) return;
        int generation = ++restartGeneration;
        webView.postDelayed(() -> {
            if (active && generation == restartGeneration) startRecognizer();
        }, delayMs);
    }

    private void dispatchSpeech(String text, boolean isFinal) {
        dispatchSpeech(text, isFinal, -1, -1, "microphone");
    }

    private void dispatchSpeech(String text, boolean isFinal, long startMs, long endMs, String source) {
        if (text == null || text.trim().isEmpty()) return;
        String script = "window.dispatchEvent(new CustomEvent('nfcps-native-speech',{detail:{text:"
                + JSONObject.quote(text.trim())
                + ",final:" + (isFinal ? "true" : "false")
                + ",startMs:" + startMs
                + ",endMs:" + endMs
                + ",source:" + JSONObject.quote(source == null ? "" : source)
                + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void dispatchState(String state, String message) {
        String script = "window.dispatchEvent(new CustomEvent('nfcps-native-speech-state',{detail:{state:"
                + JSONObject.quote(state)
                + ",message:" + JSONObject.quote(message == null ? "" : message) + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void dispatchLocalAsrState(String state, String message) {
        String script = "window.dispatchEvent(new CustomEvent('nfcps-local-asr-state',{detail:{state:"
                + JSONObject.quote(state == null ? "" : state)
                + ",message:" + JSONObject.quote(message == null ? "" : message) + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void dispatchDirectState(String state, String message, double rmsDb, int peak, long frames) {
        String script = "window.dispatchEvent(new CustomEvent('nfcps-direct-audio-state',{detail:{state:"
                + JSONObject.quote(state == null ? "" : state)
                + ",message:" + JSONObject.quote(message == null ? "" : message)
                + ",rmsDb:" + String.format(Locale.US, "%.2f", rmsDb)
                + ",peak:" + peak
                + ",frames:" + frames
                + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    public void onState(String state, String message, double rmsDb, int peak, long frames) {
        dispatchDirectState(state, message, rmsDb, peak, frames);
        if (lensController.isActive()) {
            if ("requesting".equals(state) || "starting".equals(state)) lensController.setStatus("Starting Lens…");
            if ("capturing".equals(state)) lensController.setStatus("Lens listening");
            if (("blocked".equals(state) || "unsupported".equals(state) || "error".equals(state)) && !microphoneFallback) {
                microphoneFallback = true;
                lensController.setStatus("Lens · mic");
                activity.runOnUiThread(this::requestStart);
            }
        }
    }

    @Override
    public void onChunk(byte[] wavBytes, long captureStartMs, long durationMs, double rmsDb) {
        if (wavBytes == null || wavBytes.length == 0) return;
        localTranscriber.acceptWav(wavBytes, captureStartMs, durationMs);
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        dispatchState("listening", "");
        if (lensController.isActive() && microphoneFallback) lensController.setStatus("Lens · mic");
    }

    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() {}

    @Override
    public void onError(int error) {
        if (!active) return;
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            active = false;
            dispatchState("permission-required", "Microphone permission is needed for Live Church Lens.");
            return;
        }
        if (error == SpeechRecognizer.ERROR_NO_MATCH
                || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                || error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
            scheduleRestart(error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? 700 : 250);
            return;
        }
        dispatchState("listening", "");
        scheduleRestart(900);
    }

    private long micElapsedMs() {
        return lensStartedAt > 0 ? Math.max(0, System.currentTimeMillis() - lensStartedAt) : 0;
    }

    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            String text = matches.get(0);
            dispatchSpeech(text, true);
            if (lensController.isActive() && microphoneFallback) {
                long end = micElapsedMs();
                lensController.analyze(text, Math.max(0, end - 8000), end);
            }
        }
        scheduleRestart(250);
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) {
            String text = matches.get(0);
            dispatchSpeech(text, false);
            if (lensController.isActive() && microphoneFallback && text.trim().length() >= 28) {
                long end = micElapsedMs();
                lensController.analyze(text, Math.max(0, end - 6000), end);
            }
        }
    }

    @Override public void onEvent(int eventType, Bundle params) {}
}

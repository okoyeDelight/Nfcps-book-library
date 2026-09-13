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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class NativeSpeechBridge implements RecognitionListener, DirectAudioCaptureService.Listener {
    public static final int REQUEST_RECORD_AUDIO = 7201;

    private final Activity activity;
    private final WebView webView;
    private final String sessionToken = UUID.randomUUID().toString();
    private final LocalVoskTranscriber localTranscriber;
    private final NativeScriptureLensController lensController;
    private final NativeCoverLoader coverLoader;
    private final ExecutorService coverExecutor = Executors.newFixedThreadPool(3);
    private final Runnable readDiscoveryMonitor;
    private SpeechRecognizer recognizer;
    private boolean active;
    private boolean pendingStart;
    private int restartGeneration;

    public NativeSpeechBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.coverLoader = new NativeCoverLoader(activity);
        DirectAudioCaptureService.setListener(this);
        localTranscriber = new LocalVoskTranscriber(activity, new LocalVoskTranscriber.Listener() {
            @Override
            public void onRecognizerState(String state, String message) {
                dispatchLocalAsrState(state, message);
                if ("preparing".equals(state) && lensController != null && lensController.isActive()) {
                    lensController.setStatus("Preparing Lens…");
                }
                if ("ready".equals(state) && lensController != null && lensController.isActive()) {
                    lensController.setStatus("Lens listening");
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
                NativeReadCoverPatch.inject(webView);
                webView.postDelayed(this, 700);
            }
        };
        webView.postDelayed(readDiscoveryMonitor, 700);
    }

    String getSessionToken() { return sessionToken; }
    private boolean validToken(String token) { return sessionToken.equals(token); }

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

    @JavascriptInterface
    public void requestCover(String token, String requestId, String url) {
        if (!validToken(token) || requestId == null || requestId.isBlank() || url == null || url.isBlank()) return;
        coverExecutor.execute(() -> {
            String dataUrl = coverLoader.loadAsDataUrl(url);
            String script = "window.dispatchEvent(new CustomEvent('nfcps-cover-ready',{detail:{id:"
                    + JSONObject.quote(requestId)
                    + ",dataUrl:"
                    + (dataUrl == null ? "null" : JSONObject.quote(dataUrl))
                    + "}}));";
            webView.post(() -> webView.evaluateJavascript(script, null));
        });
    }

    @JavascriptInterface
    public void openBookPreview(String token, String title, String isbn, String googleBookId) {
        if (!validToken(token)) return;
        activity.runOnUiThread(() -> NativeBookPreviewDialog.open(activity, title, isbn, googleBookId));
    }

    private void startLensInternal() {
        activity.runOnUiThread(() -> {
            localTranscriber.resetSession();
            lensController.setActive(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                beginDirectAudio(false);
            } else {
                lensController.setStatus("Playback Lens needs Android 10+");
                dispatchDirectState("unsupported", "Scripture Lens playback capture requires Android 10 or newer.", -120, 0, 0);
            }
        });
    }

    private void stopLensInternal() {
        activity.runOnUiThread(() -> {
            lensController.setActive(false);
            stopDirectAudioInternal();
        });
    }

    private void beginDirectAudio(boolean externalRequest) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            dispatchDirectState("unsupported", "Direct Audio requires Android 10 or newer.", -120, 0, 0);
            if (!externalRequest && lensController.isActive()) lensController.setStatus("Playback Lens unavailable");
            return;
        }
        localTranscriber.resetSession();
        DirectAudioCaptureService.setListener(this);
        dispatchDirectState("requesting", "Android playback-capture permission is required once for this Lens session.", -120, 0, 0);
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
            coverExecutor.shutdownNow();
        });
    }

    private void requestStart() {
        if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
            active = false;
            dispatchState("unsupported", "Android speech recognition is unavailable on this device.");
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
            } catch (Exception ignored) {}
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

    private void resumeSelectedPlayback() {
        activity.runOnUiThread(() -> {
            try { webView.onResume(); } catch (Exception ignored) {}
            String js = "(()=>{const f=document.querySelector('.wv3-selected .wv3-player iframe');"
                    + "if(!f||!f.contentWindow)return;try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}), '*')}catch(e){}})()";
            webView.evaluateJavascript(js, null);
            webView.postDelayed(() -> webView.evaluateJavascript(js, null), 500);
        });
    }

    @Override
    public void onState(String state, String message, double rmsDb, int peak, long frames) {
        dispatchDirectState(state, message, rmsDb, peak, frames);
        if (!lensController.isActive()) return;
        if ("requesting".equals(state)) lensController.setStatus("Allow playback Lens…");
        if ("starting".equals(state)) {
            lensController.setStatus("Starting Lens…");
            resumeSelectedPlayback();
        }
        if ("capturing".equals(state)) {
            lensController.setStatus("Lens listening");
            resumeSelectedPlayback();
        }
        if ("blocked".equals(state)) lensController.setStatus("Playback audio unavailable");
        if ("unsupported".equals(state) || "error".equals(state)) lensController.setStatus("Lens unavailable on this playback");
    }

    @Override
    public void onChunk(byte[] wavBytes, long captureStartMs, long durationMs, double rmsDb) {
        if (!lensController.isActive() || wavBytes == null || wavBytes.length == 0) return;
        localTranscriber.acceptWav(wavBytes, captureStartMs, durationMs);
    }

    @Override public void onReadyForSpeech(Bundle params) { dispatchState("listening", ""); }
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

    @Override
    public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) dispatchSpeech(matches.get(0), true);
        scheduleRestart(250);
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches != null && !matches.isEmpty()) dispatchSpeech(matches.get(0), false);
    }

    @Override public void onEvent(int eventType, Bundle params) {}
}

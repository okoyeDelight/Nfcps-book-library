package org.nfcpsunizik.one;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.UUID;

public final class NativeSpeechBridge implements RecognitionListener {
    public static final int REQUEST_RECORD_AUDIO = 7201;

    private final Activity activity;
    private final WebView webView;
    private final String sessionToken = UUID.randomUUID().toString();
    private SpeechRecognizer recognizer;
    private boolean active;
    private boolean pendingStart;
    private int restartGeneration;

    public NativeSpeechBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
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

    public void onPermissionResult(boolean granted) {
        activity.runOnUiThread(() -> {
            if (!pendingStart) return;
            pendingStart = false;
            if (!granted) {
                active = false;
                dispatchState("permission-required", "Microphone permission is needed so Scripture Lens can hear the sermon.");
                return;
            }
            active = true;
            startRecognizer();
        });
    }

    public void destroy() {
        activity.runOnUiThread(() -> {
            stopInternal(true);
            if (recognizer != null) {
                recognizer.destroy();
                recognizer = null;
            }
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
            dispatchState("permission-required", "Allow microphone access once so Scripture Lens can hear the sermon.");
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
            dispatchState("paused", "Scripture Lens could not start Android speech recognition. Tap Resume to try again.");
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
        if (!destroying) dispatchState("paused", "Scripture Lens paused.");
    }

    private void scheduleRestart(long delayMs) {
        if (!active) return;
        int generation = ++restartGeneration;
        webView.postDelayed(() -> {
            if (active && generation == restartGeneration) startRecognizer();
        }, delayMs);
    }

    private void dispatchSpeech(String text, boolean isFinal) {
        if (text == null || text.trim().isEmpty()) return;
        String script = "window.dispatchEvent(new CustomEvent('nfcps-native-speech',{detail:{text:"
                + JSONObject.quote(text.trim())
                + ",final:" + (isFinal ? "true" : "false") + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private void dispatchState(String state, String message) {
        String script = "window.dispatchEvent(new CustomEvent('nfcps-native-speech-state',{detail:{state:"
                + JSONObject.quote(state)
                + ",message:" + JSONObject.quote(message == null ? "" : message) + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        dispatchState("listening", "");
    }

    @Override
    public void onBeginningOfSpeech() {
    }

    @Override
    public void onRmsChanged(float rmsdB) {
    }

    @Override
    public void onBufferReceived(byte[] buffer) {
    }

    @Override
    public void onEndOfSpeech() {
    }

    @Override
    public void onError(int error) {
        if (!active) return;
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            active = false;
            dispatchState("permission-required", "Microphone permission is needed so Scripture Lens can hear the sermon.");
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

    @Override
    public void onEvent(int eventType, Bundle params) {
    }
}

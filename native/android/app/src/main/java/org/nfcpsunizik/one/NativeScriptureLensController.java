package org.nfcpsunizik.one;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.BufferedReader;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class NativeScriptureLensController {
    interface Controls {
        void startLens();
        void stopLens();
    }

    private static final String API = "https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y";
    private final Activity activity;
    private final WebView webView;
    private final FrameLayout root;
    private final Controls controls;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final Runnable monitor;

    private TextView pill;
    private LinearLayout card;
    private boolean active;
    private boolean destroyed;
    private boolean requestBusy;
    private String lastText = "";
    private long lastRequestAt;
    private Pending pending;

    NativeScriptureLensController(Activity activity, WebView webView, Controls controls) {
        this.activity = activity;
        this.webView = webView;
        this.controls = controls;
        ViewGroup parent = (ViewGroup) webView.getParent();
        this.root = parent instanceof FrameLayout ? (FrameLayout) parent : null;
        this.monitor = new Runnable() {
            @Override public void run() {
                if (destroyed) return;
                checkSelectedScreen();
                webView.postDelayed(this, 850);
            }
        };
        webView.postDelayed(monitor, 1000);
    }

    boolean isActive() { return active; }

    void setActive(boolean value) {
        active = value;
        activity.runOnUiThread(() -> {
            if (pill != null) {
                pill.setText(value ? "✦  Lens listening" : "✦  Scripture Lens");
                pill.setBackground(makePillBackground(value));
            }
            if (!value) hideCard();
        });
    }

    void setStatus(String text) {
        if (!active) return;
        activity.runOnUiThread(() -> { if (pill != null) pill.setText("✦  " + text); });
    }

    void analyze(String text, long startMs, long endMs) {
        if (!active || text == null) return;
        String clean = text.replaceAll("\\s+", " ").trim();
        if (clean.length() < 12 || clean.equalsIgnoreCase(lastText)) return;
        long now = System.currentTimeMillis();
        if (requestBusy || now - lastRequestAt < 3500) {
            pending = new Pending(clean, startMs, endMs);
            return;
        }
        lastText = clean;
        lastRequestAt = now;
        requestBusy = true;
        setStatus("Finding Scripture…");
        queryCurrentVideo(meta -> {
            if (meta == null) {
                finishRequest();
                return;
            }
            network.execute(() -> postSpeech(meta, clean, startMs, endMs));
        });
    }

    void destroy() {
        destroyed = true;
        webView.removeCallbacks(monitor);
        controls.stopLens();
        activity.runOnUiThread(() -> {
            if (pill != null && root != null) root.removeView(pill);
            if (card != null && root != null) root.removeView(card);
            pill = null;
            card = null;
        });
        network.shutdownNow();
    }

    private void checkSelectedScreen() {
        hideLegacyWebLens();
        webView.evaluateJavascript("Boolean(document.querySelector('.wv3-selected'))", value -> {
            boolean selected = "true".equalsIgnoreCase(value);
            if (selected) ensurePill();
            else {
                if (active) controls.stopLens();
                active = false;
                removePill();
                hideCard();
            }
        });
    }

    private void hideLegacyWebLens() {
        String js = "(()=>{let s=document.getElementById('nfcps-native-scripture-lens-style');"
                + "if(!s){s=document.createElement('style');s.id='nfcps-native-scripture-lens-style';document.head.appendChild(s);}"
                + "s.textContent='.sermon-auto-lens,.sermon-lens-pill{display:none!important}';})()";
        webView.evaluateJavascript(js, null);
    }

    private void ensurePill() {
        if (root == null || pill != null) return;
        activity.runOnUiThread(() -> {
            if (pill != null || root == null) return;
            TextView view = new TextView(activity);
            view.setText(active ? "✦  Lens listening" : "✦  Scripture Lens");
            view.setTextColor(Color.rgb(245, 246, 243));
            view.setTextSize(12);
            view.setGravity(Gravity.CENTER);
            view.setPadding(dp(15), dp(10), dp(15), dp(10));
            view.setBackground(makePillBackground(active));
            view.setElevation(dp(12));
            view.setOnClickListener(v -> {
                if (active) controls.stopLens(); else controls.startLens();
            });
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            params.gravity = Gravity.BOTTOM | Gravity.END;
            params.setMargins(dp(14), dp(14), dp(14), dp(18));
            root.addView(view, params);
            pill = view;
        });
    }

    private void removePill() {
        activity.runOnUiThread(() -> {
            if (pill != null && root != null) root.removeView(pill);
            pill = null;
        });
    }

    private GradientDrawable makePillBackground(boolean on) {
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(on ? Color.rgb(18, 67, 47) : Color.rgb(5, 26, 19));
        bg.setStroke(dp(1), Color.rgb(196, 160, 84));
        bg.setCornerRadius(dp(40));
        return bg;
    }

    private void queryCurrentVideo(VideoCallback callback) {
        String js = "(()=>{const r=document.querySelector('.wv3-selected');if(!r)return null;"
                + "const fs=[...r.querySelectorAll('.wv3-player iframe')];let id='';"
                + "for(const f of fs){const m=String(f.src||'').match(/\\/embed\\/([A-Za-z0-9_-]{11})/);if(m){id=m[1];break;}}"
                + "if(!id)return null;return JSON.stringify({id,title:r.querySelector('.wv3-info h1')?.textContent?.trim()||'Sermon',"
                + "creator:r.querySelector('.wv3-creator strong')?.textContent?.trim()||'Trusted creator',"
                + "category:r.querySelector('.wv3-creator small')?.textContent?.trim()||'Christian Growth'});})()";
        webView.evaluateJavascript(js, raw -> callback.onVideo(parseVideo(raw)));
    }

    private VideoMeta parseVideo(String raw) {
        try {
            if (raw == null || "null".equals(raw)) return null;
            Object decoded = new JSONTokener(raw).nextValue();
            String json = decoded instanceof String ? (String) decoded : raw;
            JSONObject obj = new JSONObject(json);
            String id = obj.optString("id", "");
            if (!id.matches("^[A-Za-z0-9_-]{11}$")) return null;
            return new VideoMeta(id, obj.optString("title", "Sermon"), obj.optString("creator", "Trusted creator"), obj.optString("category", "Christian Growth"));
        } catch (Exception ignored) { return null; }
    }

    private void postSpeech(VideoMeta video, String text, long startMs, long endMs) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(API + "/api/watch/sermon/" + video.id + "/speech-lens");
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(15000);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "NFCPS-One-Scripture-Lens/1.6.1");
            connection.setDoOutput(true);
            JSONObject body = new JSONObject();
            body.put("text", text);
            body.put("start", Math.max(0, startMs) / 1000.0);
            body.put("end", Math.max(startMs + 1000, endMs) / 1000.0);
            body.put("title", video.title);
            body.put("creator", video.creator);
            body.put("category", video.category);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            if (code >= 200 && code < 300) {
                StringBuilder json = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) json.append(line);
                }
                JSONObject result = new JSONObject(json.toString());
                JSONArray passages = result.optJSONArray("passages");
                if (result.optBoolean("available") && passages != null && passages.length() > 0) {
                    JSONObject passage = passages.optJSONObject(0);
                    if (passage != null) {
                        showPassage(passage.optString("reference"), passage.optString("text"), result.optString("theme"), result.optString("note"));
                    }
                }
                webView.post(() -> webView.evaluateJavascript(
                        "window.dispatchEvent(new Event('nfcps-watch-intelligence-learned'));",
                        null));
            }
        } catch (Exception ignored) {
        } finally {
            if (connection != null) connection.disconnect();
            finishRequest();
        }
    }

    private void finishRequest() {
        requestBusy = false;
        setStatus("Lens listening");
        Pending next = pending;
        pending = null;
        if (next != null && active) webView.postDelayed(() -> analyze(next.text, next.startMs, next.endMs), 150);
    }

    private void showPassage(String reference, String text, String theme, String note) {
        if (reference == null || reference.isBlank() || text == null || text.isBlank() || root == null) return;
        activity.runOnUiThread(() -> {
            hideCard();
            LinearLayout box = new LinearLayout(activity);
            box.setOrientation(LinearLayout.VERTICAL);
            box.setPadding(dp(17), dp(14), dp(17), dp(14));
            GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                    new int[]{Color.rgb(4, 19, 13), Color.rgb(8, 37, 26)});
            bg.setCornerRadius(dp(20));
            bg.setStroke(dp(1), Color.rgb(156, 132, 77));
            box.setBackground(bg);
            box.setElevation(dp(18));

            TextView label = textView("SCRIPTURE LENS" + (theme == null || theme.isBlank() ? "" : " · " + theme.toUpperCase()), 9, Color.rgb(216, 184, 104));
            TextView ref = textView(reference, 18, Color.WHITE);
            ref.setPadding(0, dp(5), 0, dp(5));
            TextView verse = textView(text, 13, Color.rgb(220, 228, 223));
            if (note != null && !note.isBlank()) {
                TextView hint = textView(note, 10, Color.rgb(146, 163, 154));
                hint.setPadding(0, dp(7), 0, 0);
                box.addView(label); box.addView(ref); box.addView(verse); box.addView(hint);
            } else {
                box.addView(label); box.addView(ref); box.addView(verse);
            }
            box.setOnClickListener(v -> webView.evaluateJavascript("window.dispatchEvent(new Event('nfcps-scripture-lens-open'));", null));
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            params.gravity = Gravity.BOTTOM;
            params.setMargins(dp(14), dp(14), dp(14), dp(72));
            root.addView(box, params);
            card = box;
            webView.postDelayed(this::hideCard, 10500);
        });
    }

    private TextView textView(String value, int size, int color) {
        TextView view = new TextView(activity);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.15f);
        return view;
    }

    private void hideCard() {
        activity.runOnUiThread(() -> {
            if (card != null && root != null) root.removeView(card);
            card = null;
        });
    }

    private int dp(int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private interface VideoCallback { void onVideo(VideoMeta meta); }
    private static final class VideoMeta {
        final String id, title, creator, category;
        VideoMeta(String id, String title, String creator, String category) {
            this.id = id; this.title = title; this.creator = creator; this.category = category;
        }
    }
    private static final class Pending {
        final String text; final long startMs, endMs;
        Pending(String text, long startMs, long endMs) { this.text = text; this.startMs = startMs; this.endMs = endMs; }
    }
}

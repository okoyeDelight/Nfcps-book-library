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
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class NativeScriptureLensController {
    interface Controls {
        void startLens();
        void stopLens();
    }

    private static final String API = "https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y";
    private static final long MATCH_REPEAT_WINDOW_MS = 18_000L;
    private final Activity activity;
    private final WebView webView;
    private final FrameLayout root;
    private final Controls controls;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final Runnable monitor;
    private final Deque<String> recentSpeech = new ArrayDeque<>();
    private final Map<String, TranslationSet> translationCache = new HashMap<>();

    private TextView pill;
    private LinearLayout card;
    private boolean active;
    private boolean destroyed;
    private boolean requestBusy;
    private String lastText = "";
    private String lastShownReference = "";
    private long lastRequestAt;
    private long lastShownAt;
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
        if (!value) {
            recentSpeech.clear();
            lastText = "";
        }
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
        if (clean.length() < 12) return;
        rememberSpeech(clean);
        String context = recentContext();
        if (context.length() < 20 || context.equalsIgnoreCase(lastText)) return;
        long now = System.currentTimeMillis();
        if (requestBusy || now - lastRequestAt < 3500) {
            pending = new Pending(context, startMs, endMs);
            return;
        }
        lastText = context;
        lastRequestAt = now;
        requestBusy = true;
        setStatus("Understanding this thought…");
        queryCurrentVideo(meta -> {
            if (meta == null) {
                finishRequest();
                return;
            }
            network.execute(() -> postSpeech(meta, context, startMs, endMs));
        });
    }

    private void rememberSpeech(String clean) {
        String last = recentSpeech.peekLast();
        if (last != null) {
            if (clean.equalsIgnoreCase(last) || last.toLowerCase().contains(clean.toLowerCase())) return;
            if (clean.toLowerCase().startsWith(last.toLowerCase()) || last.toLowerCase().startsWith(clean.toLowerCase())) {
                recentSpeech.removeLast();
            }
        }
        recentSpeech.addLast(clean);
        while (recentSpeech.size() > 7 || recentContextLength() > 1900) recentSpeech.removeFirst();
    }

    private int recentContextLength() {
        int total = 0;
        for (String item : recentSpeech) total += item.length() + 2;
        return total;
    }

    private String recentContext() {
        StringBuilder context = new StringBuilder();
        for (String item : recentSpeech) {
            if (context.length() > 0) context.append(". ");
            context.append(item);
        }
        return context.toString();
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
                recentSpeech.clear();
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
            connection.setRequestProperty("User-Agent", "NFCPS-One-Scripture-Lens/1.6.2");
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
                        String reference = passage.optString("reference");
                        String kjv = passage.optString("text");
                        long now = System.currentTimeMillis();
                        if (!reference.isBlank() && (!reference.equalsIgnoreCase(lastShownReference) || now - lastShownAt >= MATCH_REPEAT_WINDOW_MS)) {
                            TranslationSet translations = translationsFor(reference, kjv);
                            lastShownReference = reference;
                            lastShownAt = now;
                            showPassage(reference, translations, result.optString("theme"), result.optString("note"), Math.max(0, passages.length() - 1));
                        }
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

    private TranslationSet translationsFor(String reference, String kjv) {
        TranslationSet cached = translationCache.get(reference.toLowerCase());
        if (cached != null) return cached;
        String web = fetchTranslation(reference, "web");
        String asv = fetchTranslation(reference, "asv");
        TranslationSet set = new TranslationSet(kjv, web, asv);
        translationCache.put(reference.toLowerCase(), set);
        return set;
    }

    private String fetchTranslation(String reference, String translation) {
        HttpURLConnection connection = null;
        try {
            String encoded = URLEncoder.encode(reference, StandardCharsets.UTF_8);
            URL url = new URL("https://bible-api.com/" + encoded + "?translation=" + translation);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(3500);
            connection.setReadTimeout(4500);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "NFCPS-One-Scripture-Lens/1.6.2");
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) return "";
            StringBuilder json = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) json.append(line);
            }
            return new JSONObject(json.toString()).optString("text", "").replaceAll("\\s+", " ").trim();
        } catch (Exception ignored) {
            return "";
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void finishRequest() {
        requestBusy = false;
        setStatus("Lens listening");
        Pending next = pending;
        pending = null;
        if (next != null && active) webView.postDelayed(() -> analyze(next.text, next.startMs, next.endMs), 150);
    }

    private void showPassage(String reference, TranslationSet translations, String theme, String note, int moreCount) {
        if (reference == null || reference.isBlank() || translations.kjv.isBlank() || root == null) return;
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

            String labelText = "SCRIPTURE LENS · SEMANTIC MATCH" + (theme == null || theme.isBlank() ? "" : " · " + theme.toUpperCase());
            TextView label = textView(labelText, 9, Color.rgb(216, 184, 104));
            TextView ref = textView(reference, 18, Color.WHITE);
            ref.setPadding(0, dp(5), 0, dp(4));

            TextView kjvLabel = textView("KJV", 9, Color.rgb(199, 171, 104));
            TextView kjvVerse = textView(translations.kjv, 13, Color.rgb(226, 232, 228));
            kjvVerse.setMaxLines(5);
            box.addView(label);
            box.addView(ref);
            box.addView(kjvLabel);
            box.addView(kjvVerse);

            if (!translations.web.isBlank()) {
                TextView webLabel = textView("WEB · modern public-domain English", 9, Color.rgb(130, 191, 163));
                webLabel.setPadding(0, dp(8), 0, dp(2));
                TextView webVerse = textView(translations.web, 11, Color.rgb(205, 217, 210));
                webVerse.setMaxLines(4);
                box.addView(webLabel);
                box.addView(webVerse);
            }
            if (!translations.asv.isBlank()) {
                TextView asvLabel = textView("ASV · 1901", 9, Color.rgb(130, 191, 163));
                asvLabel.setPadding(0, dp(8), 0, dp(2));
                TextView asvVerse = textView(translations.asv, 11, Color.rgb(197, 209, 202));
                asvVerse.setMaxLines(4);
                box.addView(asvLabel);
                box.addView(asvVerse);
            }
            if (note != null && !note.isBlank()) {
                TextView hint = textView(note, 10, Color.rgb(146, 163, 154));
                hint.setPadding(0, dp(8), 0, 0);
                hint.setMaxLines(3);
                box.addView(hint);
            }
            if (moreCount > 0) {
                TextView more = textView("+ " + moreCount + " related passage" + (moreCount == 1 ? "" : "s") + " found", 9, Color.rgb(216, 184, 104));
                more.setPadding(0, dp(7), 0, 0);
                box.addView(more);
            }
            TextView action = textView("Tap to open the Scripture Lens study view", 9, Color.rgb(178, 193, 185));
            action.setPadding(0, dp(8), 0, 0);
            box.addView(action);

            box.setOnClickListener(v -> webView.evaluateJavascript("window.dispatchEvent(new Event('nfcps-scripture-lens-open'));", null));
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            params.gravity = Gravity.BOTTOM;
            params.setMargins(dp(14), dp(14), dp(14), dp(72));
            root.addView(box, params);
            card = box;
            webView.postDelayed(this::hideCard, 14_000);
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
    private static final class TranslationSet {
        final String kjv, web, asv;
        TranslationSet(String kjv, String web, String asv) {
            this.kjv = kjv == null ? "" : kjv;
            this.web = web == null ? "" : web;
            this.asv = asv == null ? "" : asv;
        }
    }
}

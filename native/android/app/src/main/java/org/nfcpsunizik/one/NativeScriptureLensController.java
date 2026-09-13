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
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class NativeScriptureLensController {
    interface Controls {
        void startLens();
        void stopLens();
    }

    private static final String API = "https://api-v2.appdeploy.ai/app/nfcps-book-library-c2ma7y";
    private static final long BACKEND_INTERVAL_MS = 1300L;
    private static final long MATCH_REPEAT_WINDOW_MS = 10_000L;

    private static final VerseRule[] FAST_RULES = new VerseRule[]{
            new VerseRule("Follow Jesus", "Luke 9:23", "And he said to them all, If any man will come after me, let him deny himself, and take up his cross daily, and follow me.",
                    "follow jesus", "follow christ", "come after me", "deny yourself", "deny himself", "take up your cross", "take his cross", "discipleship"),
            new VerseRule("Trust God", "Proverbs 3:5", "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
                    "trust god", "trust the lord", "depend on god", "lean on god", "have confidence in god"),
            new VerseRule("Faith", "Hebrews 11:6", "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.",
                    "faith", "believe god", "believe in god", "walk by faith", "live by faith"),
            new VerseRule("Fear", "Isaiah 41:10", "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.",
                    "fear", "afraid", "do not be afraid", "don't be afraid", "fear not", "scared"),
            new VerseRule("Anxiety", "1 Peter 5:7", "Casting all your care upon him; for he careth for you.",
                    "anxiety", "anxious", "worry", "worried", "cast your cares", "cast your care"),
            new VerseRule("Prayer", "Philippians 4:6", "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
                    "pray", "prayer", "intercede", "intercession", "seek god in prayer", "talk to god"),
            new VerseRule("Forgiveness", "Ephesians 4:32", "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
                    "forgive", "forgiveness", "forgiving", "let go of offence", "let go of offense", "unforgiveness"),
            new VerseRule("Love", "John 13:34", "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.",
                    "love one another", "walk in love", "love people", "love your brother", "love your neighbour", "love your neighbor"),
            new VerseRule("Obedience", "John 14:15", "If ye love me, keep my commandments.",
                    "obey god", "obedience", "obey jesus", "keep his commandments", "do what god says"),
            new VerseRule("Holy Spirit", "Galatians 5:16", "This I say then, Walk in the Spirit, and ye shall not fulfil the lust of the flesh.",
                    "holy spirit", "walk in the spirit", "led by the spirit", "spirit led", "live by the spirit"),
            new VerseRule("Grace", "Ephesians 2:8", "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.",
                    "grace", "saved by grace", "god's grace", "gods grace"),
            new VerseRule("Salvation", "Romans 10:9", "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.",
                    "salvation", "be saved", "born again", "receive jesus", "accept jesus", "confess jesus"),
            new VerseRule("Identity in Christ", "2 Corinthians 5:17", "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.",
                    "in christ", "identity in christ", "new creation", "new creature", "who you are in christ"),
            new VerseRule("Holiness", "1 Peter 1:16", "Because it is written, Be ye holy; for I am holy.",
                    "holiness", "be holy", "holy life", "live holy", "consecration"),
            new VerseRule("Temptation", "1 Corinthians 10:13", "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able.",
                    "temptation", "tempted", "resist temptation", "way of escape"),
            new VerseRule("Strength", "Philippians 4:13", "I can do all things through Christ which strengtheneth me.",
                    "strength in christ", "god gives strength", "christ strengthens", "weakness", "i am weak"),
            new VerseRule("Peace", "John 14:27", "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
                    "peace", "peace of god", "troubled heart", "inner peace"),
            new VerseRule("Wisdom", "James 1:5", "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
                    "wisdom", "need wisdom", "ask god for wisdom", "divine wisdom"),
            new VerseRule("Humility", "James 4:10", "Humble yourselves in the sight of the Lord, and he shall lift you up.",
                    "humility", "humble yourself", "be humble", "pride"),
            new VerseRule("Giving", "2 Corinthians 9:7", "Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.",
                    "give", "giving", "generosity", "generous", "cheerful giver", "sow seed"),
            new VerseRule("Perseverance", "Galatians 6:9", "And let us not be weary in well doing: for in due season we shall reap, if we faint not.",
                    "don't give up", "do not give up", "persevere", "perseverance", "keep going", "do not grow weary", "don't grow weary"),
            new VerseRule("Scripture", "Psalm 119:105", "Thy word is a lamp unto my feet, and a light unto my path.",
                    "word of god", "scripture", "the bible", "god's word", "gods word", "study the word"),
            new VerseRule("Seeking God", "Matthew 6:33", "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
                    "seek god", "seek first", "kingdom of god", "put god first", "god first"),
            new VerseRule("Repentance", "Acts 3:19", "Repent ye therefore, and be converted, that your sins may be blotted out, when the times of refreshing shall come from the presence of the Lord.",
                    "repent", "repentance", "turn away from sin", "turn from sin"),
            new VerseRule("Evangelism", "Mark 16:15", "And he said unto them, Go ye into all the world, and preach the gospel to every creature.",
                    "preach the gospel", "share the gospel", "evangelism", "win souls", "soul winning", "tell people about jesus"),
            new VerseRule("Service", "Mark 10:45", "For even the Son of man came not to be ministered unto, but to minister, and to give his life a ransom for many.",
                    "serve others", "serve people", "service", "servant", "minister to people"),
            new VerseRule("Fellowship", "Hebrews 10:25", "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another.",
                    "fellowship", "gather together", "church community", "christian community", "meet together"),
            new VerseRule("Speech", "Ephesians 4:29", "Let no corrupt communication proceed out of your mouth, but that which is good to the use of edifying.",
                    "your words", "watch your words", "speak life", "speech", "what you say", "your mouth"),
            new VerseRule("Gratitude", "1 Thessalonians 5:18", "In every thing give thanks: for this is the will of God in Christ Jesus concerning you.",
                    "give thanks", "thanksgiving", "gratitude", "grateful", "thank god"),
            new VerseRule("Surrender", "Romans 12:1", "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God.",
                    "surrender to god", "yield to god", "living sacrifice", "give yourself to god", "submit to god"),
            new VerseRule("Endurance in suffering", "Romans 8:18", "For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.",
                    "suffering", "hard times", "trials", "affliction", "pain", "going through"),
            new VerseRule("Spiritual warfare", "Ephesians 6:11", "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
                    "spiritual warfare", "warfare", "fight the devil", "armour of god", "armor of god", "spiritual battle")
    };

    private final Activity activity;
    private final WebView webView;
    private final FrameLayout root;
    private final Controls controls;
    private final ExecutorService network = Executors.newFixedThreadPool(3);
    private final Runnable monitor;
    private final Deque<String> recentSpeech = new ArrayDeque<>();
    private final Map<String, TranslationSet> translationCache = new HashMap<>();

    private TextView pill;
    private LinearLayout card;
    private boolean active;
    private boolean destroyed;
    private boolean backendBusy;
    private String lastBackendContext = "";
    private String lastShownReference = "";
    private long lastBackendAt;
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
                webView.postDelayed(this, 700);
            }
        };
        webView.postDelayed(monitor, 800);
    }

    boolean isActive() { return active; }

    void setActive(boolean value) {
        active = value;
        if (!value) {
            recentSpeech.clear();
            lastBackendContext = "";
            pending = null;
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
        if (clean.length() < 4) return;
        rememberSpeech(clean);
        String context = recentContext();

        FastMatch fast = fastMatch(context);
        if (fast != null && shouldShow(fast.rule.reference)) {
            markShown(fast.rule.reference);
            TranslationSet immediate = new TranslationSet(fast.rule.kjv, "", "");
            showPassage(fast.rule.reference, immediate, fast.rule.theme,
                    "Related to what was just said · read the surrounding passage for full context.", 0, "FAST MATCH");
            loadTranslationsAsync(fast.rule.reference, fast.rule.kjv, fast.rule.theme,
                    "Related to what was just said · read the surrounding passage for full context.", 0, "FAST MATCH");
        }

        if (context.length() < 18) return;
        queueBackend(context, startMs, endMs);
    }

    private void queueBackend(String context, long startMs, long endMs) {
        long now = System.currentTimeMillis();
        if (context.equalsIgnoreCase(lastBackendContext)) return;
        if (backendBusy || now - lastBackendAt < BACKEND_INTERVAL_MS) {
            pending = new Pending(context, startMs, endMs);
            return;
        }
        backendBusy = true;
        lastBackendAt = now;
        lastBackendContext = context;
        setStatus("Matching Scripture…");
        queryCurrentVideo(meta -> {
            if (meta == null) {
                finishBackend();
                return;
            }
            network.execute(() -> postSpeech(meta, context, startMs, endMs));
        });
    }

    private void rememberSpeech(String clean) {
        String lower = clean.toLowerCase(Locale.US);
        String last = recentSpeech.peekLast();
        if (last != null) {
            String lastLower = last.toLowerCase(Locale.US);
            if (lower.equals(lastLower) || lastLower.contains(lower)) return;
            if (lower.startsWith(lastLower) || lastLower.startsWith(lower)) recentSpeech.removeLast();
        }
        recentSpeech.addLast(clean);
        while (recentSpeech.size() > 5 || recentContextLength() > 900) recentSpeech.removeFirst();
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

    private FastMatch fastMatch(String text) {
        String lower = text.toLowerCase(Locale.US)
                .replace('’', '\'')
                .replaceAll("[^a-z0-9' ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        VerseRule best = null;
        int bestScore = 0;
        for (VerseRule rule : FAST_RULES) {
            int score = 0;
            for (String keyword : rule.keywords) {
                if (!lower.contains(keyword)) continue;
                score += keyword.contains(" ") ? 6 : 3;
            }
            if (score > bestScore) {
                best = rule;
                bestScore = score;
            }
        }
        return best != null && bestScore >= 3 ? new FastMatch(best, bestScore) : null;
    }

    private boolean shouldShow(String reference) {
        long now = System.currentTimeMillis();
        return reference != null && !reference.isBlank()
                && (!reference.equalsIgnoreCase(lastShownReference) || now - lastShownAt >= MATCH_REPEAT_WINDOW_MS);
    }

    private void markShown(String reference) {
        lastShownReference = reference;
        lastShownAt = System.currentTimeMillis();
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
            connection.setConnectTimeout(5500);
            connection.setReadTimeout(10_000);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "NFCPS-One-Scripture-Lens/1.6.3");
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
                        if (!reference.isBlank() && !kjv.isBlank() && shouldShow(reference)) {
                            markShown(reference);
                            String theme = result.optString("theme");
                            String note = result.optString("note");
                            showPassage(reference, new TranslationSet(kjv, "", ""), theme, note,
                                    Math.max(0, passages.length() - 1), "AI MATCH");
                            loadTranslationsAsync(reference, kjv, theme, note,
                                    Math.max(0, passages.length() - 1), "AI MATCH");
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
            finishBackend();
        }
    }

    private void loadTranslationsAsync(String reference, String kjv, String theme, String note, int moreCount, String matchLabel) {
        TranslationSet cached = translationCache.get(reference.toLowerCase(Locale.US));
        if (cached != null && (!cached.web.isBlank() || !cached.asv.isBlank())) {
            showPassage(reference, cached, theme, note, moreCount, matchLabel);
            return;
        }
        network.execute(() -> {
            String web = fetchTranslation(reference, "web");
            String asv = fetchTranslation(reference, "asv");
            TranslationSet set = new TranslationSet(kjv, web, asv);
            translationCache.put(reference.toLowerCase(Locale.US), set);
            if (active && reference.equalsIgnoreCase(lastShownReference)) {
                showPassage(reference, set, theme, note, moreCount, matchLabel);
            }
        });
    }

    private String fetchTranslation(String reference, String translation) {
        HttpURLConnection connection = null;
        try {
            String encoded = URLEncoder.encode(reference, StandardCharsets.UTF_8);
            URL url = new URL("https://bible-api.com/" + encoded + "?translation=" + translation);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(2800);
            connection.setReadTimeout(3500);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", "NFCPS-One-Scripture-Lens/1.6.3");
            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) return "";
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

    private void finishBackend() {
        backendBusy = false;
        setStatus("Lens listening");
        Pending next = pending;
        pending = null;
        if (next != null && active) webView.postDelayed(() -> queueBackend(next.text, next.startMs, next.endMs), 80);
    }

    private void showPassage(String reference, TranslationSet translations, String theme, String note, int moreCount, String matchLabel) {
        if (reference == null || reference.isBlank() || translations.kjv.isBlank() || root == null) return;
        activity.runOnUiThread(() -> {
            hideCard();
            LinearLayout box = new LinearLayout(activity);
            box.setOrientation(LinearLayout.VERTICAL);
            box.setPadding(dp(17), dp(13), dp(17), dp(13));
            GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                    new int[]{Color.rgb(4, 19, 13), Color.rgb(8, 37, 26)});
            bg.setCornerRadius(dp(20));
            bg.setStroke(dp(1), Color.rgb(156, 132, 77));
            box.setBackground(bg);
            box.setElevation(dp(18));

            String labelText = "SCRIPTURE LENS · " + matchLabel + (theme == null || theme.isBlank() ? "" : " · " + theme.toUpperCase(Locale.US));
            TextView label = textView(labelText, 8, Color.rgb(216, 184, 104));
            TextView ref = textView(reference, 18, Color.WHITE);
            ref.setPadding(0, dp(5), 0, dp(3));
            TextView kjvLabel = textView("KJV", 8, Color.rgb(199, 171, 104));
            TextView kjvVerse = textView(translations.kjv, 13, Color.rgb(226, 232, 228));
            kjvVerse.setMaxLines(4);
            box.addView(label);
            box.addView(ref);
            box.addView(kjvLabel);
            box.addView(kjvVerse);

            if (!translations.web.isBlank()) {
                TextView webLabel = textView("WEB", 8, Color.rgb(130, 191, 163));
                webLabel.setPadding(0, dp(6), 0, dp(1));
                TextView webVerse = textView(translations.web, 10, Color.rgb(205, 217, 210));
                webVerse.setMaxLines(2);
                box.addView(webLabel);
                box.addView(webVerse);
            }
            if (!translations.asv.isBlank()) {
                TextView asvLabel = textView("ASV", 8, Color.rgb(130, 191, 163));
                asvLabel.setPadding(0, dp(5), 0, dp(1));
                TextView asvVerse = textView(translations.asv, 10, Color.rgb(190, 205, 196));
                asvVerse.setMaxLines(2);
                box.addView(asvLabel);
                box.addView(asvVerse);
            }
            if (note != null && !note.isBlank()) {
                TextView hint = textView(note, 9, Color.rgb(146, 163, 154));
                hint.setMaxLines(2);
                hint.setPadding(0, dp(6), 0, 0);
                box.addView(hint);
            }
            if (moreCount > 0) {
                TextView more = textView("+ " + moreCount + " related passage" + (moreCount == 1 ? "" : "s") + " found", 9, Color.rgb(216, 184, 104));
                more.setPadding(0, dp(5), 0, 0);
                box.addView(more);
            }
            box.setOnClickListener(v -> webView.evaluateJavascript("window.dispatchEvent(new Event('nfcps-scripture-lens-open'));", null));
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            params.gravity = Gravity.BOTTOM;
            params.setMargins(dp(12), dp(12), dp(12), dp(70));
            root.addView(box, params);
            card = box;
            webView.postDelayed(this::hideCard, 7200);
        });
    }

    private TextView textView(String value, int size, int color) {
        TextView view = new TextView(activity);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setLineSpacing(0, 1.12f);
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
            this.kjv = kjv == null ? "" : kjv.trim();
            this.web = web == null ? "" : web.trim();
            this.asv = asv == null ? "" : asv.trim();
        }
    }

    private static final class FastMatch {
        final VerseRule rule;
        final int score;
        FastMatch(VerseRule rule, int score) { this.rule = rule; this.score = score; }
    }

    private static final class VerseRule {
        final String theme, reference, kjv;
        final String[] keywords;
        VerseRule(String theme, String reference, String kjv, String... keywords) {
            this.theme = theme;
            this.reference = reference;
            this.kjv = kjv;
            this.keywords = keywords;
        }
    }
}

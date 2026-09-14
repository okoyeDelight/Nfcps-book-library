package org.nfcpsunizik.one;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

final class OriginStateMigrator {
    private static final String PREFS = "nfcps_origin_state_migration_v1";
    private static final String SNAPSHOT = "snapshot";
    private static final String CAPTURED = "captured";
    private static final String RESTORED = "restored";
    private static final String OLD_HOST = "nfcps-book-library-c2ma7y.v2.appdeploy.ai";
    private static final String NEW_HOST = "nfcps-one-watch.floot.app";

    private final SharedPreferences prefs;
    private final WebView webView;
    private boolean captureRunning;
    private boolean restoreRunning;

    OriginStateMigrator(Context context, WebView webView) {
        this.prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        this.webView = webView;
    }

    boolean isReadyForFloot() {
        return prefs.getBoolean(CAPTURED, false) && prefs.getString(SNAPSHOT, null) != null;
    }

    static boolean isFlootUrl(String url) {
        try {
            String host = Uri.parse(url).getHost();
            return host != null && NEW_HOST.equalsIgnoreCase(host);
        } catch (Exception ignored) {
            return false;
        }
    }

    void onPageFinished(String url) {
        String host;
        try {
            host = Uri.parse(url).getHost();
        } catch (Exception ignored) {
            return;
        }
        if (host == null) return;
        if (OLD_HOST.equalsIgnoreCase(host)) captureIfNeeded();
        if (NEW_HOST.equalsIgnoreCase(host)) restoreIfNeeded();
    }

    private void captureIfNeeded() {
        if (captureRunning || prefs.getBoolean(CAPTURED, false)) return;
        captureRunning = true;
        String script = "(function(){try{var out={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('nfcps-')===0){out[k]=localStorage.getItem(k);}}return JSON.stringify(out);}catch(e){return '{}';}})();";
        webView.evaluateJavascript(script, raw -> {
            captureRunning = false;
            try {
                String decoded = decodeJavascriptString(raw);
                JSONObject snapshot = new JSONObject(decoded);
                prefs.edit()
                        .putString(SNAPSHOT, snapshot.toString())
                        .putBoolean(CAPTURED, true)
                        .putLong("captured_at", System.currentTimeMillis())
                        .apply();
            } catch (Exception ignored) {
                // Never mark capture complete unless the payload was valid JSON.
            }
        });
    }

    private void restoreIfNeeded() {
        if (restoreRunning || prefs.getBoolean(RESTORED, false)) return;
        String raw = prefs.getString(SNAPSHOT, null);
        if (raw == null || !prefs.getBoolean(CAPTURED, false)) return;
        try {
            JSONObject snapshot = new JSONObject(raw);
            restoreRunning = true;
            String script = "(function(){try{var data=" + snapshot.toString() + ";Object.keys(data).forEach(function(k){if(k.indexOf('nfcps-')===0){var v=data[k];if(v===null){localStorage.removeItem(k);}else{localStorage.setItem(k,String(v));}}});return 'ok';}catch(e){return 'error:'+String(e);}})();";
            webView.evaluateJavascript(script, result -> {
                restoreRunning = false;
                if (result != null && result.contains("ok")) {
                    prefs.edit()
                            .putBoolean(RESTORED, true)
                            .putLong("restored_at", System.currentTimeMillis())
                            .apply();
                    webView.post(() -> webView.reload());
                }
            });
        } catch (Exception ignored) {
            restoreRunning = false;
        }
    }

    private static String decodeJavascriptString(String raw) throws Exception {
        if (raw == null || "null".equals(raw)) return "{}";
        JSONArray wrapper = new JSONArray("[" + raw + "]");
        return wrapper.getString(0);
    }
}

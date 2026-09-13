package org.nfcpsunizik.one;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * One-time bridge for moving NFCPS One between web origins without treating
 * an existing installation like a fresh app. The bridge copies only NFCPS
 * localStorage keys, merges them into the destination origin, then deletes
 * the temporary Android copy after a successful restore.
 */
final class OriginStateHandoff {
    private static final String PREFS = "nfcps-origin-handoff-v1";
    private static final String KEY_PENDING = "pending";
    private static final String KEY_TARGET_HOST = "target_host";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final int MAX_SNAPSHOT_CHARS = 4_500_000;

    private OriginStateHandoff() {}

    static boolean needsCrossOriginHandoff(String fromUrl, String toUrl) {
        try {
            Uri from = Uri.parse(fromUrl);
            Uri to = Uri.parse(toUrl);
            String a = from.getHost();
            String b = to.getHost();
            return "https".equalsIgnoreCase(from.getScheme())
                    && "https".equalsIgnoreCase(to.getScheme())
                    && a != null
                    && b != null
                    && !a.equalsIgnoreCase(b);
        } catch (Exception ignored) {
            return false;
        }
    }

    static void captureThenNavigate(Context context, WebView webView, String fromUrl, String toUrl, Runnable navigate) {
        if (webView == null || !needsCrossOriginHandoff(fromUrl, toUrl)) {
            navigate.run();
            return;
        }
        final String targetHost;
        try {
            targetHost = Uri.parse(toUrl).getHost();
        } catch (Exception ignored) {
            navigate.run();
            return;
        }
        if (targetHost == null || targetHost.isBlank()) {
            navigate.run();
            return;
        }

        String captureScript = "(()=>{try{const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf('nfcps-')===0){const v=localStorage.getItem(k);if(v!==null)out[k]=v;}}return JSON.stringify(out);}catch(e){return '{}';}})()";
        webView.evaluateJavascript(captureScript, encoded -> {
            try {
                String raw = decodeJavascriptString(encoded);
                if (raw != null && raw.length() <= MAX_SNAPSHOT_CHARS) {
                    JSONObject parsed = new JSONObject(raw);
                    if (parsed.length() > 0) {
                        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                                .edit()
                                .putBoolean(KEY_PENDING, true)
                                .putString(KEY_TARGET_HOST, targetHost.toLowerCase())
                                .putString(KEY_SNAPSHOT, parsed.toString())
                                .apply();
                    }
                }
            } catch (Exception ignored) {
                // A failed handoff must never block navigation. Cloud sync and
                // the destination's own local state remain valid fallbacks.
            }
            navigate.run();
        });
    }

    static void restoreIfPending(Context context, WebView webView, String loadedUrl) {
        if (webView == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_PENDING, false)) return;

        String targetHost = prefs.getString(KEY_TARGET_HOST, "");
        String snapshot = prefs.getString(KEY_SNAPSHOT, "");
        String loadedHost;
        try {
            loadedHost = Uri.parse(loadedUrl).getHost();
        } catch (Exception ignored) {
            return;
        }
        if (loadedHost == null || targetHost == null || !loadedHost.equalsIgnoreCase(targetHost) || snapshot == null || snapshot.isBlank()) return;

        final JSONObject source;
        try {
            source = new JSONObject(snapshot);
        } catch (Exception ignored) {
            clear(prefs);
            return;
        }

        String script = buildRestoreScript(source);
        webView.evaluateJavascript(script, result -> {
            if (result != null && result.contains("nfcps-handoff-ok")) {
                clear(prefs);
            }
        });
    }

    private static String buildRestoreScript(JSONObject source) {
        return "(()=>{try{const src=" + source.toString() + ";"
                + "const parse=(v,f)=>{try{return JSON.parse(v)}catch(e){return f}};"
                + "const unique=(a,b,key)=>{const out=[],seen=new Set();for(const x of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){const id=key&&x&&typeof x==='object'?String(x[key]??''):JSON.stringify(x);if(!id||seen.has(id))continue;seen.add(id);out.push(x)}return out};"
                + "const mergeReader=(sv,dv)=>{const s=parse(sv,{items:{}}),d=parse(dv,{items:{}}),si=s.items||{},di=d.items||{},items={...si};for(const k of Object.keys(di)){const a=si[k]||{},b=di[k]||{};if(!si[k]){items[k]=b;continue}const newer=Number(b.lastOpened||0)>=Number(a.lastOpened||0)?b:a;const older=newer===b?a:b;items[k]={...older,...newer,lastOpened:Math.max(Number(a.lastOpened||0),Number(b.lastOpened||0)),saved:Boolean(a.saved||b.saved),bookmarks:[...new Set([...(a.bookmarks||[]),...(b.bookmarks||[])])].sort((x,y)=>x-y),annotations:unique(a.annotations,b.annotations,'id'),offline:Boolean(a.offline||b.offline)}}return JSON.stringify({items})};"
                + "const arrayKeys=new Set(['nfcps-watch-liked','nfcps-watch-subscribed','nfcps-watch-goals','nfcps-watch-growth-days']);"
                + "const objectArrayKeys=new Set(['nfcps-watch-history','nfcps-watch-later','nfcps-watch-takeaways','nfcps-watch-scripture-saves']);"
                + "const mapKeys=new Set(['nfcps-watch-notes','nfcps-watch-responses','nfcps-watch-journeys','nfcps-watch-progress']);"
                + "for(const [k,sv] of Object.entries(src)){const dv=localStorage.getItem(k);if(dv===null){localStorage.setItem(k,String(sv));continue}"
                + "if(k==='nfcps-reader-v3'){localStorage.setItem(k,mergeReader(String(sv),dv));continue}"
                + "if(arrayKeys.has(k)){localStorage.setItem(k,JSON.stringify(unique(parse(String(sv),[]),parse(dv,[]),null)));continue}"
                + "if(objectArrayKeys.has(k)){localStorage.setItem(k,JSON.stringify(unique(parse(dv,[]),parse(String(sv),[]),'id')));continue}"
                + "if(mapKeys.has(k)){const a=parse(String(sv),{}),b=parse(dv,{});localStorage.setItem(k,JSON.stringify({...a,...b}));continue}"
                + "if(k==='nfcps-watch-growth-memory'||k==='nfcps-moments-settings'){const a=parse(String(sv),{}),b=parse(dv,{});localStorage.setItem(k,JSON.stringify({...a,...b}));continue}"
                + "if(k.indexOf('nfcps-loan-')===0||k.indexOf('nfcps-wait-')===0||k==='nfcps-account-session-v1'||k==='nfcps-account-cache-v2'){if(!dv)localStorage.setItem(k,String(sv));continue}"
                + "}"
                + "window.dispatchEvent(new Event('nfcps-reader-updated'));window.dispatchEvent(new Event('nfcps-member-state-changed'));window.dispatchEvent(new Event('nfcps-cloud-applied'));"
                + "return 'nfcps-handoff-ok';}catch(e){return 'nfcps-handoff-error';}})()";
    }

    private static String decodeJavascriptString(String encoded) {
        if (encoded == null || "null".equals(encoded)) return null;
        try {
            JSONArray wrapper = new JSONArray("[" + encoded + "]");
            return wrapper.optString(0, null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static void clear(SharedPreferences prefs) {
        prefs.edit().remove(KEY_PENDING).remove(KEY_TARGET_HOST).remove(KEY_SNAPSHOT).apply();
    }
}

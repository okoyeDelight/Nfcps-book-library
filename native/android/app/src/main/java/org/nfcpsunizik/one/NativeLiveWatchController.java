package org.nfcpsunizik.one;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

final class NativeLiveWatchController {
    private static final long FOREGROUND_REFRESH_MS = 2 * 60 * 1000L;

    private final Activity activity;
    private final WebView appWebView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private volatile boolean checking;
    private volatile boolean destroyed;
    private String visibleUrl = "";
    private boolean autoOpenPending;
    private String pendingLiveUrl = "";
    private String pendingLiveTitle = "Live now";
    private String pendingLiveCreator = "NFCPS Watch";
    private String pendingLivePlatform = "facebook";
    private Dialog liveDialog;
    private WebView liveWebView;

    private final Runnable foregroundRefresh = new Runnable() {
        @Override public void run() {
            if (destroyed || !isWatchUrl(visibleUrl)) return;
            refreshNow();
            handler.postDelayed(this, FOREGROUND_REFRESH_MS);
        }
    };

    NativeLiveWatchController(Activity activity, WebView appWebView) {
        this.activity = activity;
        this.appWebView = appWebView;
    }

    void handleIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra(LiveWatchWorker.EXTRA_OPEN_LIVE, false)) return;
        autoOpenPending = true;
        pendingLiveUrl = intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_URL) == null ? "" : intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_URL);
        pendingLiveTitle = intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_TITLE) == null ? "Live now" : intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_TITLE);
        pendingLiveCreator = intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_CREATOR) == null ? "NFCPS Watch" : intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_CREATOR);
        pendingLivePlatform = intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_PLATFORM) == null ? "facebook" : intent.getStringExtra(LiveWatchWorker.EXTRA_LIVE_PLATFORM);
    }

    String initialUrl(String baseUrl) {
        if (!autoOpenPending) return baseUrl;
        try {
            Uri base = Uri.parse(baseUrl);
            return base.buildUpon().encodedPath("/watch/").clearQuery().fragment(null).appendQueryParameter("source", "live-notification").build().toString();
        } catch (Exception ignored) {
            return baseUrl;
        }
    }

    void onPageFinished(String url) {
        visibleUrl = url == null ? "" : url;
        handler.removeCallbacks(foregroundRefresh);
        if (!isWatchUrl(visibleUrl)) return;

        if (autoOpenPending && !pendingLiveUrl.isBlank()) {
            autoOpenPending = false;
            String urlToOpen = pendingLiveUrl;
            String title = pendingLiveTitle;
            String creator = pendingLiveCreator;
            String platform = pendingLivePlatform;
            appWebView.postDelayed(() -> openLiveInternal(urlToOpen, title, creator, platform), 350);
        }

        refreshNow();
        handler.postDelayed(foregroundRefresh, FOREGROUND_REFRESH_MS);
    }

    void onResume() {
        if (isWatchUrl(visibleUrl)) refreshNow();
    }

    private void refreshNow() {
        if (checking || destroyed) return;
        checking = true;
        new Thread(() -> {
            try {
                LiveWatchRepository.LiveItem live = LiveWatchRepository.fetchLive();
                if (destroyed) return;
                appWebView.post(() -> {
                    if (destroyed || !isWatchUrl(appWebView.getUrl())) return;
                    if (live == null) {
                        appWebView.evaluateJavascript("(function(){var x=document.getElementById('nfcps-native-live-banner');if(x)x.remove();})();", null);
                    } else {
                        appWebView.evaluateJavascript(buildBannerScript(live), null);
                    }
                });
            } catch (Exception ignored) {
                // Keep the existing Watch screen untouched if live detection is temporarily unavailable.
            } finally {
                checking = false;
            }
        }, "NFCPS-Live-Watch").start();
    }

    @JavascriptInterface
    public void openLive(String url, String title, String creator, String platform) {
        activity.runOnUiThread(() -> openLiveInternal(url, title, creator, platform));
    }

    private void openLiveInternal(String url, String title, String creator, String platform) {
        String safe = safeWatchUrl(url);
        if (safe == null) return;
        showLiveDialog(safe, title, creator, platform);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void showLiveDialog(String url, String title, String creator, String platform) {
        dismissDialog();
        liveDialog = new Dialog(activity, android.R.style.Theme_DeviceDefault_NoActionBar);

        LinearLayout shell = new LinearLayout(activity);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(3, 12, 9));

        LinearLayout bar = new LinearLayout(activity);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(8), 0, dp(8), 0);
        bar.setBackgroundColor(Color.rgb(7, 24, 19));

        TextView back = new TextView(activity);
        back.setText("‹");
        back.setTextColor(Color.WHITE);
        back.setTextSize(34);
        back.setGravity(Gravity.CENTER);
        back.setContentDescription("Back");
        back.setOnClickListener(v -> {
            if (liveWebView != null && liveWebView.canGoBack()) liveWebView.goBack();
            else dismissDialog();
        });
        bar.addView(back, new LinearLayout.LayoutParams(dp(46), dp(56)));

        LinearLayout copy = new LinearLayout(activity);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.setGravity(Gravity.CENTER_VERTICAL);
        TextView heading = new TextView(activity);
        heading.setText(creator == null || creator.isBlank() ? "NFCPS Watch" : creator);
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(15);
        heading.setSingleLine(true);
        TextView sub = new TextView(activity);
        sub.setText((platform == null ? "Live" : platform.substring(0, 1).toUpperCase() + platform.substring(1)) + " · LIVE NOW");
        sub.setTextColor(Color.rgb(247, 112, 112));
        sub.setTextSize(10);
        sub.setSingleLine(true);
        copy.addView(heading);
        copy.addView(sub);
        bar.addView(copy, new LinearLayout.LayoutParams(0, dp(56), 1f));

        TextView close = new TextView(activity);
        close.setText("×");
        close.setTextColor(Color.WHITE);
        close.setTextSize(25);
        close.setGravity(Gravity.CENTER);
        close.setContentDescription("Close live video");
        close.setOnClickListener(v -> dismissDialog());
        bar.addView(close, new LinearLayout.LayoutParams(dp(46), dp(56)));

        liveWebView = new WebView(activity);
        WebSettings settings = liveWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " NFCPSOne-Live/1.0");
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(liveWebView, true);

        liveWebView.setWebChromeClient(new WebChromeClient());
        liveWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if (!("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) return true;
                String host = uri.getHost();
                if (host != null && isTrustedPlaybackHost(host)) return false;
                try { activity.startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                return true;
            }
        });

        shell.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));
        shell.addView(liveWebView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        liveDialog.setContentView(shell);
        liveDialog.setOnDismissListener(ignored -> destroyLiveWebView());
        liveDialog.show();

        Window window = liveDialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            window.setStatusBarColor(Color.rgb(7, 24, 19));
            window.setNavigationBarColor(Color.rgb(3, 12, 9));
        }
        liveWebView.loadUrl(url);
    }

    boolean handleBack() {
        if (liveDialog == null || !liveDialog.isShowing()) return false;
        if (liveWebView != null && liveWebView.canGoBack()) liveWebView.goBack();
        else dismissDialog();
        return true;
    }

    void destroy() {
        destroyed = true;
        handler.removeCallbacks(foregroundRefresh);
        dismissDialog();
    }

    private void dismissDialog() {
        if (liveDialog != null) {
            Dialog dialog = liveDialog;
            liveDialog = null;
            dialog.dismiss();
        } else {
            destroyLiveWebView();
        }
    }

    private void destroyLiveWebView() {
        if (liveWebView == null) return;
        try { liveWebView.stopLoading(); } catch (Exception ignored) {}
        try { liveWebView.loadUrl("about:blank"); } catch (Exception ignored) {}
        try { liveWebView.destroy(); } catch (Exception ignored) {}
        liveWebView = null;
    }

    private String buildBannerScript(LiveWatchRepository.LiveItem live) {
        JSONObject data = new JSONObject();
        try {
            data.put("creator", live.creator);
            data.put("title", live.title);
            data.put("url", live.watchUrl());
            data.put("platform", live.platform);
            data.put("thumbnail", live.thumbnailUrl);
            data.put("test", live.manualOverride);
        } catch (Exception ignored) {}

        return "(function(){try{var d=" + data + ";"
                + "window.__NFCPS_NATIVE_LIVE__=d;"
                + "function mount(){if(location.pathname.indexOf('/watch')!==0)return;"
                + "var old=document.getElementById('nfcps-native-live-banner');if(old)old.remove();"
                + "var anchor=document.querySelector('.wv3-pagebar');var app=document.querySelector('.wv3-app')||document.querySelector('main');if(!app)return;"
                + "var card=document.createElement('button');card.id='nfcps-native-live-banner';card.type='button';card.setAttribute('aria-label','Watch '+d.creator+' live');"
                + "card.style.cssText='width:calc(100% - 28px);margin:4px 14px 16px;padding:0;border:0;border-radius:22px;overflow:hidden;display:flex;align-items:stretch;text-align:left;background:linear-gradient(135deg,#2b090d 0%,#16070a 58%,#071812 100%);color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.26);min-height:104px;position:relative;z-index:4';"
                + "if(d.thumbnail){var im=document.createElement('img');im.src=d.thumbnail;im.alt='';im.style.cssText='width:104px;min-width:104px;object-fit:cover;background:#10251d';card.appendChild(im);}"
                + "var c=document.createElement('span');c.style.cssText='display:flex;flex-direction:column;justify-content:center;gap:5px;padding:15px 16px;min-width:0;flex:1';"
                + "var row=document.createElement('span');row.style.cssText='display:flex;gap:7px;align-items:center';"
                + "var pill=document.createElement('b');pill.textContent='LIVE';pill.style.cssText='font:800 10px/1 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.08em;background:#f02849;color:#fff;border-radius:999px;padding:6px 8px';row.appendChild(pill);"
                + "var network=document.createElement('span');network.textContent=(d.platform||'Live').toUpperCase();network.style.cssText='font:700 10px/1 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.06em;color:#d8b868';row.appendChild(network);c.appendChild(row);"
                + "var h=document.createElement('strong');h.textContent=d.creator||'Live now';h.style.cssText='font:750 17px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';c.appendChild(h);"
                + "var p=document.createElement('span');p.textContent=d.title||'Tap to watch now';p.style.cssText='font:500 12px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;color:rgba(255,255,255,.72);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden';c.appendChild(p);card.appendChild(c);"
                + "var go=document.createElement('span');go.textContent='›';go.style.cssText='align-self:center;padding-right:16px;font:300 30px/1 -apple-system,BlinkMacSystemFont,sans-serif;color:rgba(255,255,255,.65)';card.appendChild(go);"
                + "card.onclick=function(){try{window.NFCPSNativeLive.openLive(String(d.url||''),String(d.title||''),String(d.creator||''),String(d.platform||''));}catch(e){location.href=d.url;}};"
                + "if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);else app.insertBefore(card,app.firstChild);"
                + "}mount();setTimeout(mount,450);setTimeout(mount,1400);"
                + "if(!window.__NFCPS_NATIVE_LIVE_OBSERVER__){window.__NFCPS_NATIVE_LIVE_OBSERVER__=new MutationObserver(function(){if(!document.getElementById('nfcps-native-live-banner'))mount();});window.__NFCPS_NATIVE_LIVE_OBSERVER__.observe(document.documentElement,{childList:true,subtree:true});}"
                + "return 'live-mounted';}catch(e){return 'live-error';}})();";
    }

    private static boolean isWatchUrl(String raw) {
        try {
            Uri uri = Uri.parse(raw);
            String path = uri.getPath();
            return path != null && (path.equals("/watch") || path.startsWith("/watch/"));
        } catch (Exception ignored) {
            return false;
        }
    }

    private static String safeWatchUrl(String raw) {
        try {
            Uri uri = Uri.parse(raw);
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || !isTrustedPlaybackHost(host)) return null;
            return uri.toString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private static boolean isTrustedPlaybackHost(String host) {
        String value = host.toLowerCase();
        return value.equals("facebook.com")
                || value.endsWith(".facebook.com")
                || value.equals("fb.watch")
                || value.equals("youtube.com")
                || value.endsWith(".youtube.com")
                || value.equals("youtu.be");
    }

    private int dp(int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }
}

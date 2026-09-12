package org.nfcpsunizik.one;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.util.Rational;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private FrameLayout root;
    private WebView webView;
    private ProgressBar progress;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private Dialog authDialog;
    private WebView authWebView;
    private NativeSpeechBridge nativeSpeechBridge;
    private UpdateManager updateManager;
    private volatile BootstrapConfig.Config bootstrapConfig;
    private volatile String currentAppUrl = BootstrapConfig.nativeUrl(BootstrapConfig.DEFAULT_APP_URL);

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(7, 16, 31));
        getWindow().setNavigationBarColor(Color.rgb(7, 16, 31));

        bootstrapConfig = BootstrapConfig.cached(this);
        currentAppUrl = BootstrapConfig.nativeUrl(bootstrapConfig.appUrl);

        root = new FrameLayout(this);
        webView = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);

        FrameLayout.LayoutParams webParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        root.addView(webView, webParams);

        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = Gravity.TOP;
        progress.setMax(100);
        root.addView(progress, progressParams);
        setContentView(root);

        nativeSpeechBridge = new NativeSpeechBridge(this, webView);
        webView.addJavascriptInterface(nativeSpeechBridge, "NFCPSNativeSpeech");
        updateManager = new UpdateManager(this);
        configureWebView(webView, false);

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternal(Uri.parse(url)));

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(currentAppUrl);
        }

        BootstrapConfig.refreshAsync(this, config -> runOnUiThread(() -> applyBootstrap(config)));
    }

    private void applyBootstrap(BootstrapConfig.Config config) {
        if (config == null) return;
        String nextUrl = BootstrapConfig.nativeUrl(config.appUrl);
        String previousUrl = currentAppUrl;
        bootstrapConfig = config;
        currentAppUrl = nextUrl;
        if (webView != null && !sameTarget(previousUrl, nextUrl)) {
            webView.stopLoading();
            webView.loadUrl(nextUrl);
        }
    }

    private boolean sameTarget(String first, String second) {
        try {
            Uri a = Uri.parse(first);
            Uri b = Uri.parse(second);
            String aHost = a.getHost();
            String bHost = b.getHost();
            String aPath = a.getPath() == null ? "/" : a.getPath();
            String bPath = b.getPath() == null ? "/" : b.getPath();
            return "https".equalsIgnoreCase(a.getScheme())
                    && "https".equalsIgnoreCase(b.getScheme())
                    && aHost != null
                    && bHost != null
                    && aHost.equalsIgnoreCase(bHost)
                    && aPath.equals(bPath);
        } catch (Exception ignored) {
            return first != null && first.equals(second);
        }
    }

    private Uri routeInternalNavigation(Uri requested) {
        BootstrapConfig.Config config = bootstrapConfig;
        if (config == null || requested == null || requested.getHost() == null) return requested;

        String host = requested.getHost().toLowerCase();
        String path = requested.getPath() == null || requested.getPath().isBlank() ? "/" : requested.getPath();
        String mainHost;
        try {
            mainHost = Uri.parse(config.appUrl).getHost();
        } catch (Exception ignored) {
            return requested;
        }
        if (mainHost == null) return requested;

        BootstrapConfig.RouteOverride route = BootstrapConfig.routeForPath(config, path);
        if (route != null) {
            try {
                String targetHost = Uri.parse(route.targetOrigin).getHost();
                if (targetHost != null && host.equalsIgnoreCase(targetHost)) return requested;
                if (host.equalsIgnoreCase(mainHost) || BootstrapConfig.isRouteHost(config, host)) {
                    return replaceOrigin(requested, route.targetOrigin, false);
                }
            } catch (Exception ignored) {
                return requested;
            }
        }

        if (BootstrapConfig.isRouteHost(config, host)) {
            return replaceOrigin(requested, config.appUrl, true);
        }
        return requested;
    }

    private Uri replaceOrigin(Uri requested, String baseUrl, boolean ensureNativeSource) {
        try {
            Uri base = Uri.parse(baseUrl);
            String authority = base.getEncodedAuthority();
            if (!"https".equalsIgnoreCase(base.getScheme()) || authority == null || authority.isBlank()) return requested;

            Uri.Builder builder = new Uri.Builder()
                    .scheme("https")
                    .encodedAuthority(authority)
                    .encodedPath(requested.getEncodedPath() == null || requested.getEncodedPath().isBlank() ? "/" : requested.getEncodedPath());

            boolean sourcePresent = false;
            for (String name : requested.getQueryParameterNames()) {
                if ("source".equals(name)) sourcePresent = true;
                for (String value : requested.getQueryParameters(name)) {
                    builder.appendQueryParameter(name, value);
                }
            }
            if (ensureNativeSource && !sourcePresent) builder.appendQueryParameter("source", "native");
            if (requested.getEncodedFragment() != null) builder.encodedFragment(requested.getEncodedFragment());
            return builder.build();
        } catch (Exception ignored) {
            return requested;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView target, boolean popup) {
        WebSettings settings = target.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setUserAgentString(settings.getUserAgentString() + " NFCPSOne/1.5.2");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(target, true);
        }

        target.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                boolean webUrl = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);

                if (popup && webUrl) {
                    return false;
                }
                if (webUrl && isInternalHost(uri.getHost())) {
                    Uri routed = routeInternalNavigation(uri);
                    if (routed != null && !sameTarget(uri.toString(), routed.toString())) {
                        view.loadUrl(routed.toString());
                        return true;
                    }
                    return false;
                }

                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!popup) {
                    String token = nativeSpeechBridge != null ? nativeSpeechBridge.getSessionToken() : "";
                    view.evaluateJavascript(
                            "window.__NFCPS_NATIVE__=true;window.__NFCPS_DIRECT_AUDIO__=true;window.__NFCPS_SPEECH_TOKEN__="
                                    + JSONObject.quote(token)
                                    + ";document.documentElement.classList.add('nfcps-native-app');",
                            null
                    );
                    if (updateManager != null) updateManager.checkForUpdatesOnce();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (!popup && request.isForMainFrame()) {
                    showOfflineFallback(view);
                }
            }
        });

        target.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (!popup) {
                    progress.setProgress(newProgress);
                    progress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                if (popup) return false;
                return showInAppAuthWindow(resultMsg);
            }

            @Override
            public void onCloseWindow(WebView window) {
                if (popup) dismissAuthWindow();
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (popup) return;
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                root.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }

            @Override
            public void onHideCustomView() {
                if (!popup) hideCustomView();
            }
        });
    }

    private boolean isInternalHost(String host) {
        if (host == null) return false;
        BootstrapConfig.Config config = bootstrapConfig;
        return config != null && config.internalHosts.contains(host.toLowerCase());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private boolean showInAppAuthWindow(Message resultMsg) {
        dismissAuthWindow();

        authDialog = new Dialog(this, android.R.style.Theme_DeviceDefault_NoActionBar);
        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(3, 12, 9));

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(10), 0, dp(8), 0);
        bar.setBackgroundColor(Color.rgb(7, 24, 19));

        TextView close = new TextView(this);
        close.setText("‹");
        close.setTextColor(Color.WHITE);
        close.setTextSize(34);
        close.setGravity(Gravity.CENTER);
        close.setContentDescription("Close sign in");
        close.setOnClickListener(view -> dismissAuthWindow());
        bar.addView(close, new LinearLayout.LayoutParams(dp(48), dp(54)));

        TextView title = new TextView(this);
        title.setText("Sign in to NFCPS One");
        title.setTextColor(Color.WHITE);
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER_VERTICAL);
        title.setSingleLine(true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(54), 1f);
        bar.addView(title, titleParams);

        TextView secure = new TextView(this);
        secure.setText("Secure");
        secure.setTextColor(Color.rgb(169, 205, 185));
        secure.setTextSize(11);
        secure.setGravity(Gravity.CENTER);
        bar.addView(secure, new LinearLayout.LayoutParams(dp(58), dp(54)));

        authWebView = new WebView(this);
        configureWebView(authWebView, true);
        shell.addView(bar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(54)
        ));
        shell.addView(authWebView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        authDialog.setContentView(shell);
        authDialog.setOnDismissListener(dialog -> {
            if (authWebView != null) {
                authWebView.stopLoading();
                authWebView.loadUrl("about:blank");
                authWebView.destroy();
                authWebView = null;
            }
            authDialog = null;
        });
        authDialog.show();

        Window window = authDialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            window.setStatusBarColor(Color.rgb(7, 24, 19));
            window.setNavigationBarColor(Color.rgb(3, 12, 9));
        }

        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
        transport.setWebView(authWebView);
        resultMsg.sendToTarget();
        return true;
    }

    private void dismissAuthWindow() {
        if (authDialog != null) {
            authDialog.dismiss();
            return;
        }
        if (authWebView != null) {
            authWebView.destroy();
            authWebView = null;
        }
    }

    private void showOfflineFallback(WebView view) {
        String retryUrl = currentAppUrl;
        String html = "<html><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<body style='margin:0;background:#07101f;color:#fff;font-family:sans-serif;display:grid;place-items:center;min-height:100vh'>"
                + "<div style='max-width:340px;padding:32px;text-align:center'><div style='font-size:48px'>📖</div>"
                + "<h1>NFCPS One</h1><p style='opacity:.75;line-height:1.6'>You appear to be offline. Reading copies already cached by NFCPS can still work when available.</p>"
                + "<a style='display:inline-block;margin-top:12px;padding:14px 20px;border-radius:999px;background:#d8b868;color:#07101f;text-decoration:none;font-weight:700' href='"
                + retryUrl + "'>Try again</a></div></body></html>";
        view.loadDataWithBaseURL(retryUrl, html, "text/html", "UTF-8", null);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
        }
    }

    private void hideCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (customViewCallback != null) customViewCallback.onCustomViewHidden();
        customViewCallback = null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (updateManager != null) updateManager.onResume();
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && customView != null) {
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
            enterPictureInPictureMode(params);
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        progress.setVisibility(isInPictureInPictureMode ? View.GONE : progress.getProgress() >= 100 ? View.GONE : View.VISIBLE);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NativeSpeechBridge.REQUEST_RECORD_AUDIO && nativeSpeechBridge != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            nativeSpeechBridge.onPermissionResult(granted);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (authWebView != null) {
            if (authWebView.canGoBack()) {
                authWebView.goBack();
            } else {
                dismissAuthWindow();
            }
        } else if (customView != null) {
            hideCustomView();
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        dismissAuthWindow();
        if (nativeSpeechBridge != null) {
            nativeSpeechBridge.destroy();
            nativeSpeechBridge = null;
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

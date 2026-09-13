package org.nfcpsunizik.one;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.net.Uri;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

final class NativeBookPreviewDialog {
    private NativeBookPreviewDialog() {}

    @SuppressLint("SetJavaScriptEnabled")
    static void open(Activity activity, String title, String isbn, String googleBookId) {
        Dialog dialog = new Dialog(activity, android.R.style.Theme_DeviceDefault_NoActionBar);
        LinearLayout shell = new LinearLayout(activity);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(247, 244, 237));

        LinearLayout bar = new LinearLayout(activity);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(activity, 10), 0, dp(activity, 8), 0);
        bar.setBackgroundColor(Color.rgb(7, 24, 19));

        TextView close = new TextView(activity);
        close.setText("‹");
        close.setTextColor(Color.WHITE);
        close.setTextSize(34);
        close.setGravity(Gravity.CENTER);
        close.setContentDescription("Close book preview");
        close.setOnClickListener(view -> dialog.dismiss());
        bar.addView(close, new LinearLayout.LayoutParams(dp(activity, 48), dp(activity, 54)));

        TextView heading = new TextView(activity);
        heading.setText(title == null || title.isBlank() ? "Book preview" : title);
        heading.setTextColor(Color.WHITE);
        heading.setTextSize(15);
        heading.setGravity(Gravity.CENTER_VERTICAL);
        heading.setSingleLine(true);
        bar.addView(heading, new LinearLayout.LayoutParams(0, dp(activity, 54), 1f));

        TextView badge = new TextView(activity);
        badge.setText("Preview");
        badge.setTextColor(Color.rgb(216, 184, 104));
        badge.setTextSize(11);
        badge.setGravity(Gravity.CENTER);
        bar.addView(badge, new LinearLayout.LayoutParams(dp(activity, 64), dp(activity, 54)));

        WebView preview = new WebView(activity);
        WebSettings settings = preview.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " NFCPSOne-BookPreview/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(preview, true);
        preview.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) return false;
                return true;
            }
        });

        shell.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(activity, 54)));
        shell.addView(preview, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        dialog.setContentView(shell);
        dialog.setOnDismissListener(ignored -> {
            preview.stopLoading();
            preview.loadUrl("about:blank");
            preview.destroy();
        });
        dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            window.setStatusBarColor(Color.rgb(7, 24, 19));
            window.setNavigationBarColor(Color.rgb(3, 12, 9));
        }

        String url;
        if (googleBookId != null && !googleBookId.isBlank()) {
            url = "https://books.google.com/books?id=" + Uri.encode(googleBookId) + "&printsec=frontcover";
        } else if (isbn != null && !isbn.isBlank()) {
            url = "https://books.google.com/books?vid=ISBN" + Uri.encode(isbn) + "&printsec=frontcover";
        } else {
            url = "https://books.google.com/books?q=" + Uri.encode(title == null ? "" : title);
        }
        preview.loadUrl(url);
    }

    private static int dp(Activity activity, int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }
}

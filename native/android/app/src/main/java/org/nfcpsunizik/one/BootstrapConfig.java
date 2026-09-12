package org.nfcpsunizik.one;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class BootstrapConfig {
    private static final String[] CONFIG_URLS = new String[] {
            "https://raw.githubusercontent.com/okoyeDelight/Nfcps-book-library/main/nfcps-bootstrap.json",
            "https://cdn.jsdelivr.net/gh/okoyeDelight/Nfcps-book-library@main/nfcps-bootstrap.json"
    };
    private static final String PREFS = "nfcps_remote_bootstrap";
    private static final String KEY_APP_URL = "app_url";
    private static final String KEY_INTERNAL_HOSTS = "internal_hosts";

    public static final String DEFAULT_APP_URL = "https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/";
    public static final String DEFAULT_APP_HOST = "nfcps-book-library-c2ma7y.v2.appdeploy.ai";
    public static final String DEFAULT_AUTH_HOST = "api-v2.appdeploy.ai";

    public interface Callback {
        void onResolved(Config config);
    }

    public static final class Config {
        public final String appUrl;
        public final Set<String> internalHosts;

        Config(String appUrl, Set<String> internalHosts) {
            this.appUrl = appUrl;
            this.internalHosts = Collections.unmodifiableSet(new HashSet<>(internalHosts));
        }
    }

    private BootstrapConfig() {
    }

    public static Config cached(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String appUrl = sanitizeUrl(prefs.getString(KEY_APP_URL, DEFAULT_APP_URL));
        Set<String> hosts = new HashSet<>();
        String storedHosts = prefs.getString(KEY_INTERNAL_HOSTS, "");
        if (storedHosts != null && !storedHosts.isBlank()) {
            for (String host : storedHosts.split(",")) {
                String clean = sanitizeHost(host);
                if (clean != null) hosts.add(clean);
            }
        }
        addDefaults(hosts, appUrl);
        return new Config(appUrl, hosts);
    }

    public static void refreshAsync(Context context, Callback callback) {
        Context appContext = context.getApplicationContext();
        new Thread(() -> {
            Config resolved = fetchRemote(appContext);
            if (resolved == null) resolved = cached(appContext);
            if (callback != null) callback.onResolved(resolved);
        }, "NFCPS-Bootstrap").start();
    }

    private static Config fetchRemote(Context context) {
        for (String endpoint : CONFIG_URLS) {
            Config resolved = fetchEndpoint(context, endpoint);
            if (resolved != null) return resolved;
        }
        return null;
    }

    private static Config fetchEndpoint(Context context, String endpoint) {
        HttpURLConnection connection = null;
        try {
            String separator = endpoint.contains("?") ? "&" : "?";
            connection = (HttpURLConnection) new URL(endpoint + separator + "t=" + System.currentTimeMillis()).openConnection();
            connection.setConnectTimeout(3500);
            connection.setReadTimeout(3500);
            connection.setUseCaches(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-cache");
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) return null;

            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                    if (body.length() > 16_384) return null;
                }
            }

            JSONObject json = new JSONObject(body.toString());
            String appUrl = sanitizeUrl(json.optString("app_url", DEFAULT_APP_URL));
            Set<String> hosts = new HashSet<>();
            JSONArray list = json.optJSONArray("internal_hosts");
            if (list != null) {
                for (int i = 0; i < Math.min(list.length(), 24); i++) {
                    String host = sanitizeHost(list.optString(i, ""));
                    if (host != null) hosts.add(host);
                }
            }
            addDefaults(hosts, appUrl);

            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_APP_URL, appUrl)
                    .putString(KEY_INTERNAL_HOSTS, String.join(",", hosts))
                    .apply();

            return new Config(appUrl, hosts);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public static String nativeUrl(String baseUrl) {
        String clean = sanitizeUrl(baseUrl);
        Uri uri = Uri.parse(clean);
        if (uri.getQueryParameter("source") != null) return clean;
        return uri.buildUpon().appendQueryParameter("source", "native").build().toString();
    }

    private static String sanitizeUrl(String candidate) {
        try {
            if (candidate == null || candidate.length() > 2048) return DEFAULT_APP_URL;
            Uri uri = Uri.parse(candidate.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())) return DEFAULT_APP_URL;
            if (uri.getHost() == null || uri.getHost().isBlank()) return DEFAULT_APP_URL;
            if (uri.getUserInfo() != null) return DEFAULT_APP_URL;
            return uri.toString();
        } catch (Exception ignored) {
            return DEFAULT_APP_URL;
        }
    }

    private static String sanitizeHost(String candidate) {
        if (candidate == null) return null;
        String host = candidate.trim().toLowerCase();
        if (host.isEmpty() || host.length() > 253) return null;
        if (host.contains("/") || host.contains(":") || host.contains("@") || host.contains(" ")) return null;
        return host;
    }

    private static void addDefaults(Set<String> hosts, String appUrl) {
        hosts.add(DEFAULT_APP_HOST);
        hosts.add(DEFAULT_AUTH_HOST);
        try {
            String appHost = sanitizeHost(Uri.parse(appUrl).getHost());
            if (appHost != null) hosts.add(appHost);
        } catch (Exception ignored) {
        }
    }
}

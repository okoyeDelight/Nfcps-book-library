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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class BootstrapConfig {
    private static final String[] CONFIG_URLS = new String[] {
            "https://raw.githubusercontent.com/okoyeDelight/Nfcps-book-library/main/nfcps-bootstrap.json",
            "https://cdn.jsdelivr.net/gh/okoyeDelight/Nfcps-book-library@main/nfcps-bootstrap.json"
    };
    private static final String PREFS = "nfcps_remote_bootstrap";
    private static final String KEY_APP_URL = "app_url";
    private static final String KEY_INTERNAL_HOSTS = "internal_hosts";
    private static final String KEY_ROUTES = "routes";

    public static final String DEFAULT_APP_URL = "https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/";
    public static final String DEFAULT_APP_HOST = "nfcps-book-library-c2ma7y.v2.appdeploy.ai";
    public static final String DEFAULT_AUTH_HOST = "api-v2.appdeploy.ai";

    public interface Callback {
        void onResolved(Config config);
    }

    public static final class RouteOverride {
        public final String pathPrefix;
        public final String targetOrigin;

        RouteOverride(String pathPrefix, String targetOrigin) {
            this.pathPrefix = pathPrefix;
            this.targetOrigin = targetOrigin;
        }
    }

    public static final class Config {
        public final String appUrl;
        public final Set<String> internalHosts;
        public final List<RouteOverride> routes;

        Config(String appUrl, Set<String> internalHosts, List<RouteOverride> routes) {
            this.appUrl = appUrl;
            this.internalHosts = Collections.unmodifiableSet(new HashSet<>(internalHosts));
            this.routes = Collections.unmodifiableList(new ArrayList<>(routes));
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
        List<RouteOverride> routes = parseRoutesString(prefs.getString(KEY_ROUTES, "[]"));
        addDefaults(hosts, appUrl, routes);
        return new Config(appUrl, hosts, routes);
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
            List<RouteOverride> routes = parseRoutes(json.optJSONArray("routes"));
            addDefaults(hosts, appUrl, routes);

            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_APP_URL, appUrl)
                    .putString(KEY_INTERNAL_HOSTS, String.join(",", hosts))
                    .putString(KEY_ROUTES, serializeRoutes(routes))
                    .apply();

            return new Config(appUrl, hosts, routes);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public static RouteOverride routeForPath(Config config, String path) {
        if (config == null || config.routes.isEmpty()) return null;
        String cleanPath = path == null || path.isBlank() ? "/" : path;
        RouteOverride best = null;
        for (RouteOverride route : config.routes) {
            if (!pathMatches(cleanPath, route.pathPrefix)) continue;
            if (best == null || route.pathPrefix.length() > best.pathPrefix.length()) best = route;
        }
        return best;
    }

    public static boolean isRouteHost(Config config, String host) {
        String cleanHost = sanitizeHost(host);
        if (config == null || cleanHost == null) return false;
        for (RouteOverride route : config.routes) {
            try {
                String targetHost = sanitizeHost(Uri.parse(route.targetOrigin).getHost());
                if (cleanHost.equals(targetHost)) return true;
            } catch (Exception ignored) {
            }
        }
        return false;
    }

    public static String nativeUrl(String baseUrl) {
        String clean = sanitizeUrl(baseUrl);
        Uri uri = Uri.parse(clean);
        if (uri.getQueryParameter("source") != null) return clean;
        return uri.buildUpon().appendQueryParameter("source", "native").build().toString();
    }

    private static List<RouteOverride> parseRoutesString(String value) {
        try {
            return parseRoutes(new JSONArray(value == null || value.isBlank() ? "[]" : value));
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
    }

    private static List<RouteOverride> parseRoutes(JSONArray list) {
        List<RouteOverride> routes = new ArrayList<>();
        if (list == null) return routes;
        for (int i = 0; i < Math.min(list.length(), 16); i++) {
            JSONObject item = list.optJSONObject(i);
            if (item == null) continue;
            String pathPrefix = sanitizePathPrefix(item.optString("path_prefix", ""));
            String targetOrigin = sanitizeOrigin(item.optString("origin", item.optString("url", "")));
            if (pathPrefix == null || targetOrigin == null) continue;
            boolean duplicate = false;
            for (RouteOverride existing : routes) {
                if (existing.pathPrefix.equals(pathPrefix)) {
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) routes.add(new RouteOverride(pathPrefix, targetOrigin));
        }
        return routes;
    }

    private static String serializeRoutes(List<RouteOverride> routes) {
        JSONArray output = new JSONArray();
        for (RouteOverride route : routes) {
            JSONObject item = new JSONObject();
            try {
                item.put("path_prefix", route.pathPrefix);
                item.put("origin", route.targetOrigin);
                output.put(item);
            } catch (Exception ignored) {
            }
        }
        return output.toString();
    }

    private static boolean pathMatches(String path, String prefix) {
        if (path.equals(prefix)) return true;
        String boundary = prefix.endsWith("/") ? prefix : prefix + "/";
        return path.startsWith(boundary);
    }

    private static String sanitizePathPrefix(String candidate) {
        if (candidate == null) return null;
        String path = candidate.trim();
        if (path.isEmpty() || path.length() > 256 || !path.startsWith("/")) return null;
        if (path.contains("?") || path.contains("#") || path.contains("\\")) return null;
        while (path.length() > 1 && path.endsWith("/")) path = path.substring(0, path.length() - 1);
        if ("/".equals(path)) return null;
        return path;
    }

    private static String sanitizeOrigin(String candidate) {
        try {
            if (candidate == null || candidate.length() > 2048) return null;
            Uri uri = Uri.parse(candidate.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getHost() == null || uri.getHost().isBlank()) return null;
            if (uri.getUserInfo() != null) return null;
            String authority = uri.getEncodedAuthority();
            if (authority == null || authority.isBlank()) return null;
            return "https://" + authority;
        } catch (Exception ignored) {
            return null;
        }
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

    private static void addDefaults(Set<String> hosts, String appUrl, List<RouteOverride> routes) {
        hosts.add(DEFAULT_APP_HOST);
        hosts.add(DEFAULT_AUTH_HOST);
        try {
            String appHost = sanitizeHost(Uri.parse(appUrl).getHost());
            if (appHost != null) hosts.add(appHost);
        } catch (Exception ignored) {
        }
        for (RouteOverride route : routes) {
            try {
                String routeHost = sanitizeHost(Uri.parse(route.targetOrigin).getHost());
                if (routeHost != null) hosts.add(routeHost);
            } catch (Exception ignored) {
            }
        }
    }
}

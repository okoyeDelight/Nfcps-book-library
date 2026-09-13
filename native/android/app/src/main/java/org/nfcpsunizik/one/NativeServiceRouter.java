package org.nfcpsunizik.one;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Keeps the original AppDeploy UI in place while transparently moving only
 * Read and Library service traffic to Hatchable. No page/navigation routing
 * is performed here.
 */
public final class NativeServiceRouter {
    private static final String HATCHABLE_ORIGIN = "https://nfcps-one.hatchable.site";
    private static final String APPDEPLOY_API_HOST = "api-v2.appdeploy.ai";
    private static final String APPDEPLOY_WEB_HOST = "nfcps-book-library-c2ma7y.v2.appdeploy.ai";

    private static final String[] READ_MARKERS = new String[] {
            "/api/ebooks/catalog",
            "/api/reader/book/"
    };
    private static final String LIBRARY_MARKER = "/api/circulation/";

    private NativeServiceRouter() {
    }

    public static WebResourceResponse interceptGet(WebResourceRequest request) {
        if (request == null || !"GET".equalsIgnoreCase(request.getMethod())) return null;
        Uri source = request.getUrl();
        if (source == null || source.getHost() == null || !isAppDeployHost(source.getHost())) return null;

        String routedPath = servicePath(source.getEncodedPath());
        if (routedPath == null) return null;

        String targetUrl = HATCHABLE_ORIGIN + routedPath;
        String query = source.getEncodedQuery();
        if (query != null && !query.isBlank()) targetUrl += "?" + query;

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(targetUrl).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(6000);
            connection.setReadTimeout(25000);
            connection.setUseCaches(true);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", request.getRequestHeaders().getOrDefault("Accept", "application/json,*/*"));
            connection.setRequestProperty("User-Agent", "NFCPS-One/1.6.7 service-router");

            int status = connection.getResponseCode();
            InputStream raw = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (raw == null) raw = new ByteArrayInputStream(new byte[0]);

            final HttpURLConnection ownedConnection = connection;
            InputStream body = new FilterInputStream(raw) {
                @Override
                public void close() throws IOException {
                    try {
                        super.close();
                    } finally {
                        ownedConnection.disconnect();
                    }
                }
            };

            String contentType = connection.getContentType();
            String mimeType = "application/json";
            String encoding = "UTF-8";
            if (contentType != null && !contentType.isBlank()) {
                String[] parts = contentType.split(";");
                if (parts.length > 0 && !parts[0].isBlank()) mimeType = parts[0].trim();
                for (int i = 1; i < parts.length; i++) {
                    String part = parts[i].trim();
                    if (part.toLowerCase().startsWith("charset=")) {
                        String value = part.substring("charset=".length()).trim();
                        if (!value.isBlank()) encoding = value.replace("\"", "");
                    }
                }
            }

            Map<String, String> headers = flattenHeaders(connection.getHeaderFields());
            String reason = connection.getResponseMessage();
            if (reason == null || reason.isBlank()) reason = status >= 400 ? "Error" : "OK";
            return new WebResourceResponse(mimeType, encoding, status, reason, headers, body);
        } catch (Exception ignored) {
            if (connection != null) connection.disconnect();
            return null;
        }
    }

    /**
     * GETs are intercepted natively. POST bodies are not exposed by
     * WebResourceRequest, so this tiny same-page shim rewrites only circulation
     * POST URLs while the Library hash is active. The original XHR/fetch body,
     * callbacks and React UI remain untouched.
     */
    public static String libraryPostBridgeScript() {
        return "(function(){"
                + "if(window.__NFCPS_LIBRARY_SERVICE_BRIDGE_V1__)return;"
                + "window.__NFCPS_LIBRARY_SERVICE_BRIDGE_V1__=true;"
                + "var H='https://nfcps-one.hatchable.site';"
                + "var API='api-v2.appdeploy.ai';"
                + "var WEB='nfcps-book-library-c2ma7y.v2.appdeploy.ai';"
                + "function active(){var h=(location.hash||'').toLowerCase();return h==='#library'||h.indexOf('#library?')===0;}"
                + "function map(raw,method){try{if(!active()||String(method||'GET').toUpperCase()!=='POST')return null;"
                + "var u=new URL(String(raw),location.href);if(u.host!==API&&u.host!==WEB)return null;"
                + "var i=u.pathname.indexOf('/api/circulation/');if(i<0)return null;return H+u.pathname.substring(i)+u.search;}catch(e){return null;}}"
                + "if(window.fetch){var f=window.fetch.bind(window);window.fetch=function(input,init){try{var m=(init&&init.method)||(input&&input.method)||'GET';"
                + "var raw=(typeof input==='string'||input instanceof URL)?String(input):(input&&input.url)||'';var t=map(raw,m);"
                + "if(t&&!(typeof Request!=='undefined'&&input instanceof Request))return f(t,init);}catch(e){}return f(input,init);};}"
                + "if(window.XMLHttpRequest&&window.XMLHttpRequest.prototype){var o=window.XMLHttpRequest.prototype.open;"
                + "window.XMLHttpRequest.prototype.open=function(method,url){var a=Array.prototype.slice.call(arguments);var t=map(url,method);if(t)a[1]=t;return o.apply(this,a);};}"
                + "})();";
    }

    private static boolean isAppDeployHost(String host) {
        return APPDEPLOY_API_HOST.equalsIgnoreCase(host) || APPDEPLOY_WEB_HOST.equalsIgnoreCase(host);
    }

    private static String servicePath(String encodedPath) {
        if (encodedPath == null || encodedPath.isBlank()) return null;
        for (String marker : READ_MARKERS) {
            int index = encodedPath.indexOf(marker);
            if (index >= 0) return encodedPath.substring(index);
        }
        int libraryIndex = encodedPath.indexOf(LIBRARY_MARKER);
        if (libraryIndex >= 0) return encodedPath.substring(libraryIndex);
        return null;
    }

    private static Map<String, String> flattenHeaders(Map<String, List<String>> source) {
        Map<String, String> output = new LinkedHashMap<>();
        if (source == null) return output;
        for (Map.Entry<String, List<String>> entry : source.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null || entry.getValue().isEmpty()) continue;
            output.put(entry.getKey(), String.join(", ", entry.getValue()));
        }
        return output;
    }
}

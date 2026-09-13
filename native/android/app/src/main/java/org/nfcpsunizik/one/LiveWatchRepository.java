package org.nfcpsunizik.one;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class LiveWatchRepository {
    private static final String ENDPOINT = "https://nfcps-one.hatchable.site/api/watch/live";

    private LiveWatchRepository() {}

    static LiveItem fetchLive() throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(6000);
        connection.setReadTimeout(18000);
        connection.setUseCaches(false);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setRequestProperty("User-Agent", "NFCPS-One/1.6.8 LiveWatch");
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IllegalStateException("Live service returned " + status);
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                    if (body.length() > 512_000) throw new IllegalStateException("Live response too large");
                }
            }
            JSONObject root = new JSONObject(body.toString());
            JSONArray lives = root.optJSONArray("lives");
            if (lives == null || lives.length() == 0) return null;
            JSONObject item = lives.optJSONObject(0);
            if (item == null || !item.optBoolean("isLive", false)) return null;
            return new LiveItem(
                    clean(item.optString("id", "trusted-live"), 180),
                    clean(item.optString("platform", "web"), 40),
                    clean(item.optString("creator", "Live now"), 180),
                    clean(item.optString("title", "Live now"), 240),
                    safeHttps(item.optString("videoUrl", "")),
                    safeHttps(item.optString("profileUrl", "")),
                    safeHttps(item.optString("thumbnailUrl", "")),
                    clean(item.optString("videoId", ""), 180),
                    clean(item.optString("liveStartedAt", ""), 100),
                    clean(item.optString("status", "live"), 80),
                    item.optBoolean("manualOverride", false)
            );
        } finally {
            connection.disconnect();
        }
    }

    private static String clean(String value, int max) {
        String text = value == null ? "" : value.trim();
        if (text.length() > max) text = text.substring(0, max);
        return text;
    }

    private static String safeHttps(String raw) {
        try {
            URL url = new URL(raw);
            return "https".equalsIgnoreCase(url.getProtocol()) ? url.toString() : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    static final class LiveItem {
        final String id;
        final String platform;
        final String creator;
        final String title;
        final String videoUrl;
        final String profileUrl;
        final String thumbnailUrl;
        final String videoId;
        final String liveStartedAt;
        final String status;
        final boolean manualOverride;

        LiveItem(String id, String platform, String creator, String title, String videoUrl, String profileUrl,
                 String thumbnailUrl, String videoId, String liveStartedAt, String status, boolean manualOverride) {
            this.id = id;
            this.platform = platform;
            this.creator = creator;
            this.title = title;
            this.videoUrl = videoUrl;
            this.profileUrl = profileUrl;
            this.thumbnailUrl = thumbnailUrl;
            this.videoId = videoId;
            this.liveStartedAt = liveStartedAt;
            this.status = status;
            this.manualOverride = manualOverride;
        }

        String watchUrl() {
            return !videoUrl.isBlank() ? videoUrl : profileUrl;
        }

        String notificationKey() {
            if (!videoId.isBlank()) return id + ":" + videoId;
            if (!liveStartedAt.isBlank()) return id + ":" + liveStartedAt;
            return id + ":" + title;
        }
    }
}

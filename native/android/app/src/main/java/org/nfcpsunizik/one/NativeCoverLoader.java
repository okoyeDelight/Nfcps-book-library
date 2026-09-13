package org.nfcpsunizik.one;

import android.content.Context;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.security.MessageDigest;

final class NativeCoverLoader {
    private static final int MAX_BYTES = 3 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 4;
    private final File cacheDir;

    NativeCoverLoader(Context context) {
        cacheDir = new File(context.getCacheDir(), "nfcps-book-covers");
        if (!cacheDir.exists()) cacheDir.mkdirs();
    }

    String loadAsDataUrl(String rawUrl) {
        try {
            if (!isSafeHttps(rawUrl)) return null;
            String key = sha256(rawUrl);
            File cached = new File(cacheDir, key + ".img");
            byte[] bytes;
            if (cached.isFile() && cached.length() > 0 && cached.length() <= MAX_BYTES) {
                bytes = readFile(cached);
            } else {
                bytes = fetch(rawUrl, 0);
                if (bytes == null || bytes.length == 0) return null;
                try (FileOutputStream output = new FileOutputStream(cached)) {
                    output.write(bytes);
                } catch (Exception ignored) {
                }
            }
            String mime = sniffMime(bytes);
            if (mime == null) return null;
            return "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception ignored) {
            return null;
        }
    }

    private byte[] fetch(String rawUrl, int redirects) throws Exception {
        if (redirects > MAX_REDIRECTS || !isSafeHttps(rawUrl)) return null;
        URL url = new URL(rawUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(7000);
        connection.setReadTimeout(12000);
        connection.setRequestProperty("User-Agent", "NFCPS-One/1.6 ReadCover");
        connection.setRequestProperty("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
        int code = connection.getResponseCode();
        if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
            String location = connection.getHeaderField("Location");
            connection.disconnect();
            if (location == null || location.isBlank()) return null;
            return fetch(new URL(url, location).toString(), redirects + 1);
        }
        if (code < 200 || code >= 300) {
            connection.disconnect();
            return null;
        }
        int length = connection.getContentLength();
        if (length > MAX_BYTES) {
            connection.disconnect();
            return null;
        }
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BYTES) return null;
                output.write(buffer, 0, read);
            }
            byte[] bytes = output.toByteArray();
            return sniffMime(bytes) == null ? null : bytes;
        } finally {
            connection.disconnect();
        }
    }

    private boolean isSafeHttps(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
            String host = uri.getHost();
            if (host == null || host.isBlank()) return false;
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses.length == 0) return false;
            for (InetAddress address : addresses) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()
                        || address.isMulticastAddress()) return false;
                byte[] raw = address.getAddress();
                if (raw.length == 16 && (raw[0] & 0xFE) == 0xFC) return false;
            }
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private byte[] readFile(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int read;
            int total = 0;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BYTES) return new byte[0];
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private String sniffMime(byte[] data) {
        if (data == null || data.length < 12) return null;
        if ((data[0] & 0xFF) == 0xFF && (data[1] & 0xFF) == 0xD8 && (data[2] & 0xFF) == 0xFF) return "image/jpeg";
        if ((data[0] & 0xFF) == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) return "image/png";
        if (data[0] == 'G' && data[1] == 'I' && data[2] == 'F') return "image/gif";
        if (data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') return "image/webp";
        if (data.length > 12 && data[4] == 'f' && data[5] == 't' && data[6] == 'y' && data[7] == 'p') return "image/avif";
        return null;
    }

    private String sha256(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        StringBuilder builder = new StringBuilder();
        for (byte b : digest) builder.append(String.format("%02x", b));
        return builder.toString();
    }
}

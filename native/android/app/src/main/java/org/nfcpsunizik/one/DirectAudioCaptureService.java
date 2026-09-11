package org.nfcpsunizik.one;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayDeque;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

public final class DirectAudioCaptureService extends Service {
    public static final String ACTION_START = "org.nfcpsunizik.one.DIRECT_AUDIO_START";
    public static final String ACTION_STOP = "org.nfcpsunizik.one.DIRECT_AUDIO_STOP";
    public static final String EXTRA_RESULT_CODE = "projection_result_code";
    public static final String EXTRA_RESULT_DATA = "projection_result_data";

    private static final String CHANNEL_ID = "nfcps_direct_audio";
    private static final int NOTIFICATION_ID = 7412;
    private static final int SAMPLE_RATE = 48_000;
    private static final int CHANNELS = 1;
    private static final int BYTES_PER_SAMPLE = 2;
    private static final int CHUNK_SECONDS = 6;
    private static final int CHUNK_BYTES = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * CHUNK_SECONDS;
    private static final double AUDIBLE_RMS = 0.0006;
    private static final double AUDIBLE_PEAK = 0.003;

    private static final Object STATE_LOCK = new Object();
    private static final ArrayDeque<AudioChunk> CHUNKS = new ArrayDeque<>();
    private static String state = "idle";
    private static String message = "Direct Audio Lens is idle.";
    private static double lastRms = 0;
    private static double lastPeak = 0;
    private static long capturedMs = 0;
    private static long audibleMs = 0;
    private static int chunkCounter = 0;

    private MediaProjection projection;
    private AudioRecord audioRecord;
    private Thread captureThread;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private long captureStartedAt;

    public static void resetState(String nextState, String nextMessage) {
        synchronized (STATE_LOCK) {
            CHUNKS.clear();
            state = nextState;
            message = nextMessage;
            lastRms = 0;
            lastPeak = 0;
            capturedMs = 0;
            audibleMs = 0;
            chunkCounter = 0;
        }
    }

    public static void setExternalState(String nextState, String nextMessage) {
        synchronized (STATE_LOCK) {
            state = nextState;
            message = nextMessage;
        }
    }

    public static String statusJson() {
        synchronized (STATE_LOCK) {
            try {
                JSONObject value = new JSONObject();
                value.put("state", state);
                value.put("message", message);
                value.put("rms", lastRms);
                value.put("peak", lastPeak);
                value.put("capturedMs", capturedMs);
                value.put("audibleMs", audibleMs);
                value.put("queueSize", CHUNKS.size());
                value.put("sampleRate", SAMPLE_RATE);
                value.put("channels", CHANNELS);
                return value.toString();
            } catch (Exception ignored) {
                return "{\"state\":\"error\",\"message\":\"Direct audio status failed.\"}";
            }
        }
    }

    public static String takeChunkJson() {
        synchronized (STATE_LOCK) {
            AudioChunk chunk = CHUNKS.pollFirst();
            if (chunk == null) return "";
            try {
                JSONObject value = new JSONObject();
                value.put("id", chunk.id);
                value.put("mimeType", "audio/wav");
                value.put("data", Base64.encodeToString(chunk.wav, Base64.NO_WRAP));
                value.put("durationMs", chunk.durationMs);
                value.put("rms", chunk.rms);
                value.put("peak", chunk.peak);
                return value.toString();
            } catch (Exception ignored) {
                return "";
            }
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        if (ACTION_STOP.equals(intent.getAction())) {
            stopCapture("stopped", "Direct Audio Lens stopped.");
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;

        startForeground(NOTIFICATION_ID, buildNotification("Preparing direct sermon audio…"));
        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        Intent resultData = intent.getParcelableExtra(EXTRA_RESULT_DATA);
        if (resultCode == 0 || resultData == null) {
            setExternalState("error", "Android did not provide playback-capture permission.");
            stopSelf();
            return START_NOT_STICKY;
        }
        startCapture(resultCode, resultData);
        return START_NOT_STICKY;
    }

    private void startCapture(int resultCode, Intent resultData) {
        stopCaptureInternal(false);
        try {
            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            projection = manager.getMediaProjection(resultCode, resultData);
            if (projection == null) throw new IllegalStateException("MediaProjection unavailable");
            projection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    stopCapture("stopped", "Android ended the direct-audio session.");
                    stopSelf();
                }
            }, new Handler(Looper.getMainLooper()));

            AudioPlaybackCaptureConfiguration configuration = new AudioPlaybackCaptureConfiguration.Builder(projection)
                    .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                    .addMatchingUsage(AudioAttributes.USAGE_GAME)
                    .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                    .build();

            AudioFormat format = new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build();
            int minimum = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            int bufferBytes = Math.max(minimum > 0 ? minimum * 4 : 32_768, 65_536);
            audioRecord = new AudioRecord.Builder()
                    .setAudioFormat(format)
                    .setBufferSizeInBytes(bufferBytes)
                    .setAudioPlaybackCaptureConfig(configuration)
                    .build();
            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                throw new IllegalStateException("AudioRecord did not initialize");
            }

            audioRecord.startRecording();
            if (audioRecord.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
                throw new IllegalStateException("AudioRecord did not start");
            }

            resetState("capturing", "Playback capture started. Waiting for audible sermon audio…");
            running.set(true);
            captureStartedAt = SystemClock.elapsedRealtime();
            updateNotification("Direct Audio Lens is active");
            captureThread = new Thread(this::captureLoop, "NFCPS-DirectAudio");
            captureThread.start();
        } catch (Exception exception) {
            setExternalState("error", "Direct playback capture could not start on this device.");
            stopCaptureInternal(false);
            stopSelf();
        }
    }

    private void captureLoop() {
        byte[] readBuffer = new byte[16_384];
        ByteArrayOutputStream chunkBuffer = new ByteArrayOutputStream(CHUNK_BYTES + 4_096);
        double sumSquares = 0;
        long sampleCount = 0;
        int peakSample = 0;
        long chunkStartedAt = SystemClock.elapsedRealtime();
        int silentChunks = 0;

        while (running.get()) {
            int count;
            try {
                count = audioRecord.read(readBuffer, 0, readBuffer.length, AudioRecord.READ_BLOCKING);
            } catch (Exception exception) {
                setExternalState("error", "Direct audio capture stopped unexpectedly.");
                break;
            }
            if (count <= 0) continue;
            chunkBuffer.write(readBuffer, 0, count);

            for (int index = 0; index + 1 < count; index += 2) {
                int low = readBuffer[index] & 0xff;
                int high = readBuffer[index + 1];
                short sample = (short) ((high << 8) | low);
                int magnitude = Math.abs((int) sample);
                peakSample = Math.max(peakSample, magnitude);
                double normalized = sample / 32768.0;
                sumSquares += normalized * normalized;
                sampleCount += 1;
            }

            long now = SystemClock.elapsedRealtime();
            long sessionMs = Math.max(0, now - captureStartedAt);
            synchronized (STATE_LOCK) {
                capturedMs = sessionMs;
                if (sampleCount > 0) {
                    lastRms = Math.sqrt(sumSquares / sampleCount);
                    lastPeak = peakSample / 32768.0;
                }
            }

            if (chunkBuffer.size() < CHUNK_BYTES) continue;
            byte[] pcm = chunkBuffer.toByteArray();
            double rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
            double peak = peakSample / 32768.0;
            long durationMs = Math.max(1, Math.round((pcm.length / (double) (SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE)) * 1000));
            boolean audible = rms >= AUDIBLE_RMS || peak >= AUDIBLE_PEAK;

            if (audible) {
                silentChunks = 0;
                byte[] wav = wrapWav(pcm, SAMPLE_RATE, CHANNELS);
                synchronized (STATE_LOCK) {
                    audibleMs += durationMs;
                    state = "audio-detected";
                    message = "Direct playback audio detected. NFCPS is transcribing the sermon.";
                    String id = String.format(Locale.US, "direct-%d-%d", System.currentTimeMillis(), ++chunkCounter);
                    while (CHUNKS.size() >= 2) CHUNKS.pollFirst();
                    CHUNKS.addLast(new AudioChunk(id, wav, durationMs, rms, peak));
                }
            } else {
                silentChunks += 1;
                synchronized (STATE_LOCK) {
                    state = silentChunks >= 2 ? "silent-or-blocked" : "capturing";
                    message = silentChunks >= 2
                            ? "No capturable playback audio detected yet. The video may be paused or this source may block playback capture."
                            : "Playback capture is active, waiting for audible sermon audio…";
                }
            }

            chunkBuffer.reset();
            sumSquares = 0;
            sampleCount = 0;
            peakSample = 0;
            chunkStartedAt = now;
        }
        stopCaptureInternal(false);
    }

    private static byte[] wrapWav(byte[] pcm, int sampleRate, int channels) {
        int dataLength = pcm.length;
        int byteRate = sampleRate * channels * BYTES_PER_SAMPLE;
        ByteBuffer header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN);
        header.put(new byte[]{'R', 'I', 'F', 'F'});
        header.putInt(36 + dataLength);
        header.put(new byte[]{'W', 'A', 'V', 'E'});
        header.put(new byte[]{'f', 'm', 't', ' '});
        header.putInt(16);
        header.putShort((short) 1);
        header.putShort((short) channels);
        header.putInt(sampleRate);
        header.putInt(byteRate);
        header.putShort((short) (channels * BYTES_PER_SAMPLE));
        header.putShort((short) 16);
        header.put(new byte[]{'d', 'a', 't', 'a'});
        header.putInt(dataLength);
        ByteArrayOutputStream output = new ByteArrayOutputStream(44 + dataLength);
        output.write(header.array(), 0, header.array().length);
        output.write(pcm, 0, pcm.length);
        return output.toByteArray();
    }

    private void stopCapture(String nextState, String nextMessage) {
        stopCaptureInternal(true);
        setExternalState(nextState, nextMessage);
    }

    private void stopCaptureInternal(boolean interruptThread) {
        running.set(false);
        if (interruptThread && captureThread != null) captureThread.interrupt();
        captureThread = null;
        if (audioRecord != null) {
            try {
                if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) audioRecord.stop();
            } catch (Exception ignored) {
            }
            try {
                audioRecord.release();
            } catch (Exception ignored) {
            }
            audioRecord = null;
        }
        if (projection != null) {
            try {
                projection.stop();
            } catch (Exception ignored) {
            }
            projection = null;
        }
    }

    private void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Scripture Lens direct audio",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows when NFCPS is understanding sermon playback audio.");
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification(String text) {
        Notification.Builder builder = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder
                .setSmallIcon(R.drawable.ic_app)
                .setContentTitle("NFCPS Scripture Lens")
                .setContentText(text)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, buildNotification(text));
    }

    @Override
    public void onDestroy() {
        stopCaptureInternal(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static final class AudioChunk {
        final String id;
        final byte[] wav;
        final long durationMs;
        final double rms;
        final double peak;

        AudioChunk(String id, byte[] wav, long durationMs, double rms, double peak) {
            this.id = id;
            this.wav = wav;
            this.durationMs = durationMs;
            this.rms = rms;
            this.peak = peak;
        }
    }
}

package org.nfcpsunizik.one;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class DirectAudioCaptureService extends Service {
    public static final String ACTION_START = "org.nfcpsunizik.one.directaudio.START";
    public static final String ACTION_STOP = "org.nfcpsunizik.one.directaudio.STOP";
    public static final String EXTRA_RESULT_CODE = "result_code";
    public static final String EXTRA_RESULT_DATA = "result_data";

    private static final String CHANNEL_ID = "nfcps_direct_audio";
    private static final int NOTIFICATION_ID = 4107;
    private static final int OUTPUT_SAMPLE_RATE = 16_000;
    private static final int CHUNK_SECONDS = 2;
    private static final int NON_SILENT_PEAK = 100;

    public interface Listener {
        void onState(String state, String message, double rmsDb, int peak, long frames);
        void onChunk(byte[] wavBytes, long captureStartMs, long durationMs, double rmsDb);
    }

    private static volatile Listener listener;

    public static void setListener(Listener value) {
        listener = value;
    }

    private MediaProjection projection;
    private AudioRecord recorder;
    private Thread captureThread;
    private volatile boolean running;
    private int inputSampleRate = 48_000;
    private long totalFrames;
    private long captureStartedAt;
    private boolean blockedReported;

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        if (ACTION_STOP.equals(intent.getAction())) {
            stopCapture("stopped", "Direct Audio stopped.");
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;

        startProjectionForeground();
        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, 0);
        Intent resultData = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent.class)
                : intent.getParcelableExtra(EXTRA_RESULT_DATA);
        if (resultData == null || resultCode == 0) {
            emitState("error", "Android did not return a valid playback-capture session.", -120, 0);
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            projection = manager.getMediaProjection(resultCode, resultData);
            if (projection == null) throw new IllegalStateException("MediaProjection unavailable");
            projection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    stopCapture("stopped", "Android ended the Direct Audio session.");
                    stopSelf();
                }
            }, new Handler(Looper.getMainLooper()));
            startCapture();
        } catch (Exception exception) {
            emitState("error", "Direct Audio could not initialize playback capture.", -120, 0);
            stopCapture(null, null);
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private void startProjectionForeground() {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        Notification notification = builder
                .setSmallIcon(R.drawable.nfcps_logo)
                .setContentTitle("NFCPS Scripture Lens")
                .setContentText("Scripture Lens is listening to the sermon playback.")
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_SERVICE)
                .build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Scripture Lens Direct Audio",
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shown while NFCPS processes sermon playback for Scripture Lens.");
        manager.createNotificationChannel(channel);
    }

    private AudioRecord buildRecorder(int sampleRate) {
        AudioPlaybackCaptureConfiguration captureConfig = new AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .build();
        AudioFormat format = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                .build();
        int min = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        int bytes = Math.max(min > 0 ? min * 4 : 32_768, 32_768);
        return new AudioRecord.Builder()
                .setAudioFormat(format)
                .setBufferSizeInBytes(bytes)
                .setAudioPlaybackCaptureConfig(captureConfig)
                .build();
    }

    private void startCapture() {
        AudioRecord candidate = null;
        int[] rates = new int[]{48_000, 44_100, 16_000};
        for (int rate : rates) {
            try {
                candidate = buildRecorder(rate);
                if (candidate.getState() == AudioRecord.STATE_INITIALIZED) {
                    inputSampleRate = rate;
                    break;
                }
                candidate.release();
                candidate = null;
            } catch (Exception ignored) {
                if (candidate != null) {
                    try { candidate.release(); } catch (Exception ignoredRelease) {}
                }
                candidate = null;
            }
        }
        if (candidate == null) {
            emitState("error", "This device could not create a playback AudioRecord session.", -120, 0);
            stopSelf();
            return;
        }
        recorder = candidate;
        recorder.startRecording();
        if (recorder.getRecordingState() != AudioRecord.RECORDSTATE_RECORDING) {
            emitState("error", "Android did not start the playback AudioRecord session.", -120, 0);
            stopCapture(null, null);
            stopSelf();
            return;
        }
        running = true;
        totalFrames = 0;
        blockedReported = false;
        captureStartedAt = SystemClock.elapsedRealtime();
        emitState("starting", "Direct Audio started. Checking the sermon playback stream…", -120, 0);
        captureThread = new Thread(this::captureLoop, "NFCPS-DirectAudio");
        captureThread.start();
    }

    private void captureLoop() {
        short[] samples = new short[4096];
        ByteArrayOutputStream chunk = new ByteArrayOutputStream(OUTPUT_SAMPLE_RATE * CHUNK_SECONDS * 2 + 1024);
        int chunkSamples = 0;
        int chunkPeak = 0;
        double chunkSquares = 0;
        long chunkInputSamples = 0;
        long lastMetricAt = SystemClock.elapsedRealtime();

        while (running && recorder != null) {
            int read;
            try {
                read = recorder.read(samples, 0, samples.length, AudioRecord.READ_BLOCKING);
            } catch (Exception exception) {
                emitState("error", "Direct Audio lost the playback stream.", -120, 0);
                break;
            }
            if (read <= 0) continue;
            totalFrames += read;
            for (int i = 0; i < read; i++) {
                int value = samples[i];
                int abs = Math.abs(value);
                if (abs > chunkPeak) chunkPeak = abs;
                chunkSquares += (double) value * value;
                chunkInputSamples += 1;
            }

            double step = Math.max(1.0, inputSampleRate / (double) OUTPUT_SAMPLE_RATE);
            for (double index = 0; index < read; index += step) {
                short value = samples[Math.min(read - 1, (int) index)];
                chunk.write(value & 0xff);
                chunk.write((value >> 8) & 0xff);
                chunkSamples += 1;
            }

            long now = SystemClock.elapsedRealtime();
            double rmsDb = rmsDb(chunkSquares, chunkInputSamples);
            if (now - lastMetricAt >= 700) {
                boolean nonSilent = chunkPeak >= NON_SILENT_PEAK;
                emitState(nonSilent ? "capturing" : "starting",
                        nonSilent ? "Sermon playback detected." : "Waiting for sermon playback…",
                        rmsDb,
                        chunkPeak);
                lastMetricAt = now;
            }

            if (chunkSamples >= OUTPUT_SAMPLE_RATE * CHUNK_SECONDS) {
                long durationMs = Math.max(700, Math.round(chunkSamples * 1000.0 / OUTPUT_SAMPLE_RATE));
                long chunkStartMs = Math.max(0, now - captureStartedAt - durationMs);
                if (chunkPeak >= NON_SILENT_PEAK) {
                    blockedReported = false;
                    byte[] wav = wav(chunk.toByteArray(), OUTPUT_SAMPLE_RATE);
                    Listener current = listener;
                    if (current != null) current.onChunk(wav, chunkStartMs, durationMs, rmsDb);
                } else if (!blockedReported && now - captureStartedAt >= 4000) {
                    blockedReported = true;
                    emitState("blocked", "No capturable playback samples were detected. Scripture Lens will not interrupt the sermon with a microphone fallback.", rmsDb, chunkPeak);
                }
                chunk.reset();
                chunkSamples = 0;
                chunkPeak = 0;
                chunkSquares = 0;
                chunkInputSamples = 0;
            }
        }
        running = false;
    }

    private double rmsDb(double sumSquares, long count) {
        if (count <= 0 || sumSquares <= 0) return -120.0;
        double rms = Math.sqrt(sumSquares / count) / 32768.0;
        return Math.max(-120.0, 20.0 * Math.log10(Math.max(0.000001, rms)));
    }

    private byte[] wav(byte[] pcm, int sampleRate) {
        int dataLength = pcm.length;
        ByteBuffer header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN);
        header.put(new byte[]{'R', 'I', 'F', 'F'});
        header.putInt(36 + dataLength);
        header.put(new byte[]{'W', 'A', 'V', 'E'});
        header.put(new byte[]{'f', 'm', 't', ' '});
        header.putInt(16);
        header.putShort((short) 1);
        header.putShort((short) 1);
        header.putInt(sampleRate);
        header.putInt(sampleRate * 2);
        header.putShort((short) 2);
        header.putShort((short) 16);
        header.put(new byte[]{'d', 'a', 't', 'a'});
        header.putInt(dataLength);
        ByteArrayOutputStream out = new ByteArrayOutputStream(44 + dataLength);
        out.write(header.array(), 0, 44);
        out.write(pcm, 0, pcm.length);
        return out.toByteArray();
    }

    private void emitState(String state, String message, double rmsDb, int peak) {
        Listener current = listener;
        if (current != null) current.onState(state, message, rmsDb, peak, totalFrames);
    }

    private synchronized void stopCapture(String state, String message) {
        running = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (Exception ignored) {}
            try { recorder.release(); } catch (Exception ignored) {}
            recorder = null;
        }
        if (projection != null) {
            MediaProjection current = projection;
            projection = null;
            try { current.stop(); } catch (Exception ignored) {}
        }
        if (state != null) emitState(state, message == null ? "" : message, -120, 0);
        try { stopForeground(STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        stopCapture(null, null);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

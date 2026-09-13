package org.nfcpsunizik.one;

import android.app.Activity;
import org.json.JSONObject;
import org.vosk.LibVosk;
import org.vosk.LogLevel;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.StorageService;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class LocalVoskTranscriber {
    interface Listener {
        void onRecognizerState(String state, String message);
        void onTranscript(String text, boolean isFinal, long startMs, long endMs);
    }

    private static final int HEADER = 44;
    private final Listener listener;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Deque<Chunk> pending = new ArrayDeque<>();
    private volatile boolean closed;
    private volatile boolean ready;
    private Model model;
    private Recognizer recognizer;
    private String lastText = "";

    LocalVoskTranscriber(Activity activity, Listener listener) {
        this.listener = listener;
        LibVosk.setLogLevel(LogLevel.INFO);
        listener.onRecognizerState("preparing", "Preparing offline Scripture Lens…");
        StorageService.unpack(activity, "model-en-us", "nfcps-scripture-lens-model-v1",
                unpacked -> executor.execute(() -> initialize(unpacked)),
                error -> listener.onRecognizerState("error", "Offline Scripture Lens model could not be prepared."));
    }

    private void initialize(Model unpacked) {
        if (closed) {
            try { unpacked.close(); } catch (Exception ignored) {}
            return;
        }
        try {
            model = unpacked;
            recognizer = new Recognizer(model, 16000.0f);
            ready = true;
            listener.onRecognizerState("ready", "Offline Scripture Lens is ready.");
            while (true) {
                Chunk chunk;
                synchronized (pending) { chunk = pending.pollFirst(); }
                if (chunk == null) break;
                transcribe(chunk.wav, chunk.startMs, chunk.durationMs);
            }
        } catch (Exception ignored) {
            listener.onRecognizerState("error", "Offline Scripture Lens recognizer could not start.");
        }
    }

    void resetSession() {
        executor.execute(() -> {
            lastText = "";
            if (recognizer != null) {
                try { recognizer.reset(); } catch (Exception ignored) {}
            }
        });
    }

    void acceptWav(byte[] wav, long startMs, long durationMs) {
        if (closed || wav == null || wav.length <= HEADER) return;
        byte[] copy = Arrays.copyOf(wav, wav.length);
        if (!ready) {
            synchronized (pending) {
                while (pending.size() >= 6) pending.removeFirst();
                pending.addLast(new Chunk(copy, startMs, durationMs));
            }
            return;
        }
        executor.execute(() -> transcribe(copy, startMs, durationMs));
    }

    private void transcribe(byte[] wav, long startMs, long durationMs) {
        if (closed || recognizer == null) return;
        try {
            byte[] pcm = Arrays.copyOfRange(wav, HEADER, wav.length);
            boolean complete = recognizer.acceptWaveForm(pcm, pcm.length);
            JSONObject json = new JSONObject(complete ? recognizer.getResult() : recognizer.getPartialResult());
            String text = json.optString(complete ? "text" : "partial", "").trim();
            if (text.length() < 4 || text.equalsIgnoreCase(lastText)) return;
            lastText = text;
            listener.onTranscript(text, complete, startMs, Math.max(startMs + 700, startMs + durationMs));
        } catch (Exception ignored) {}
    }

    void close() {
        closed = true;
        ready = false;
        synchronized (pending) { pending.clear(); }
        executor.execute(() -> {
            if (recognizer != null) try { recognizer.close(); } catch (Exception ignored) {}
            if (model != null) try { model.close(); } catch (Exception ignored) {}
            recognizer = null;
            model = null;
        });
        executor.shutdown();
    }

    private static final class Chunk {
        final byte[] wav;
        final long startMs;
        final long durationMs;
        Chunk(byte[] wav, long startMs, long durationMs) {
            this.wav = wav;
            this.startMs = startMs;
            this.durationMs = durationMs;
        }
    }
}

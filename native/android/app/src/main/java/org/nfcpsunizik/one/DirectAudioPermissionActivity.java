package org.nfcpsunizik.one;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;

public final class DirectAudioPermissionActivity extends Activity {
    private static final int REQUEST_AUDIO_PERMISSION = 7401;
    private static final int REQUEST_MEDIA_PROJECTION = 7402;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            finish();
            return;
        }
        requestAudioPermissionIfNeeded();
    }

    private void requestAudioPermissionIfNeeded() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_AUDIO_PERMISSION);
            return;
        }
        requestProjection();
    }

    private void requestProjection() {
        MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        if (manager == null) {
            finish();
            return;
        }
        startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_AUDIO_PERMISSION) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) requestProjection();
        else finish();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_MEDIA_PROJECTION) return;
        if (resultCode == RESULT_OK && data != null) {
            Intent service = new Intent(this, DirectAudioCaptureService.class);
            service.setAction(DirectAudioCaptureService.ACTION_START);
            service.putExtra(DirectAudioCaptureService.EXTRA_RESULT_CODE, resultCode);
            service.putExtra(DirectAudioCaptureService.EXTRA_RESULT_DATA, data);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(service);
            else startService(service);
        }
        finish();
    }
}

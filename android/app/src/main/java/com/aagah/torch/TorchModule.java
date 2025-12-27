package com.aagah;

import android.content.Context;
import android.content.Intent;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class TorchModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public TorchModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "TorchModule";
    }

    @ReactMethod
    public void playAlarm(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, AlarmService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ALARM_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopAlarm(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, AlarmService.class);
            reactContext.stopService(serviceIntent);
            // Also ensure Torch is off in case service didn't clean up fully (redundant but
            // safe)
            setTorch(false);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    // Keep this for manual torch switching (if used elsewhere)
    private void setTorch(boolean on) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                CameraManager camManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
                if (camManager != null) {
                    String cameraId = camManager.getCameraIdList()[0];
                    camManager.setTorchMode(cameraId, on);
                }
            } catch (Exception e) {
            }
        }
    }

    @ReactMethod
    public void switchState(boolean newState, Promise promise) {
        setTorch(newState);
        promise.resolve(true);
    }
}

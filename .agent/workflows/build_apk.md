---
description: How to build an Android APK for React Native
---

1. Navigate to the android directory
   ```bash
   cd android
   ```

2. Clean the build (optional but recommended)
   ```bash
   ./gradlew clean
   ```

3. Build the Debug APK (for testing on emulator/device, no specific signing needed)
   ```bash
   // turbo
   ./gradlew assembleDebug
   ```
   - The APK will be located at: `android/app/build/outputs/apk/debug/app-debug.apk`

4. Build the Release APK (for production/Play Store)
   > **Note:** You need to configure a signing key in `android/app/build.gradle` for a release build.
   ```bash
   ./gradlew assembleRelease
   ```
   - The APKs will be located at: `android/app/build/outputs/apk/release/`
   - You will see multiple APKs (e.g., `app-arm64-v8a-release.apk`).
   - Choose the one matching your device architecture (usually `arm64-v8a` for modern phones), or `armeabi-v7a` for older devices.
   - Each APK should be significantly smaller (~5-15MB).

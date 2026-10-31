# Zovibe — Mobile Development & Expo Connection Guide

This guide explains step-by-step how to run and connect **Zovibe** to a physical mobile phone in development mode.

---

## ⚠️ Important Note: Expo Go vs. Expo Dev Client

> **Why can't Zovibe run directly inside standard Expo Go from Google Play / App Store?**
>
> Zovibe uses **`react-native-track-player`** (for native background audio playback, notification media controls, and lock screen controls) and **`react-native-fast-image`** (for high-performance image caching). These libraries contain custom native Android (Java/Kotlin/C++) and iOS (Swift/Obj-C) code. Standard Expo Go does **not** bundle these native libraries and will crash on startup if loaded directly.
>
> **The Solution:** Use **Expo Dev Client** (`expo-dev-client`).
> Expo Dev Client gives you the **exact same developer experience as Expo Go** (Metro hot reloading, instant code refresh, QR code pairing, debug menu), but includes your project's custom native code compiled into a development build APK.

---

## 🛠️ Prerequisites

1. **Computer**:
   - **Node.js**: v18+ (tested on Node v22)
   - **npm**: v10+
   - **Android SDK / Android Studio** (if building locally) OR **EAS CLI** (`npm install -g eas-cli`) for cloud builds.
2. **Mobile Phone**:
   - Android phone with **Developer Options** and **USB Debugging** enabled.
   - Connected to the **same Wi-Fi network** as your computer, OR connected via **USB cable**.

---

## 🚀 Method 1: Local Development Build via USB (Recommended & Fastest)

This method compiles the development client directly onto your connected Android phone.

### Step 1: Connect your phone via USB
1. Plug your Android phone into your PC with a USB cable.
2. On your phone, enable **USB Debugging** (Settings > Developer Options > USB Debugging).
3. Allow the USB debugging prompt on your phone when prompted.
4. Verify your phone is recognized:
   ```bash
   adb devices
   ```
   *(You should see your device ID with the status `device`)*.

### Step 2: Reverse the Metro port (prevents connection drops)
```bash
adb reverse tcp:8081 tcp:8081
```

### Step 3: Build and install the Dev Client to your phone
Run the local Android build script:
```bash
npm run android
```
*(Or `npx expo run:android`)*.

- Gradle will compile the native code including `react-native-track-player`.
- The app will automatically install and open on your connected phone.
- Metro bundler will start and stream the JavaScript bundle to your phone.

---

## ☁️ Method 2: EAS Cloud Build (No Android Studio required on PC)

If you don't have Android Studio or the Android SDK installed on your PC, you can build the APK in the cloud using EAS.

### Step 1: Install EAS CLI and login
```bash
npm install -g eas-cli
eas login
```

### Step 2: Trigger the Android Development Build
```bash
npm run build:dev
```
*(Or `eas build --profile development --platform android`)*.

### Step 3: Install the APK on your phone
1. When the cloud build finishes, EAS will provide a download link and a QR code in the terminal.
2. Scan the QR code or open the link on your mobile phone to download the `app-development.apk`.
3. Install the APK on your phone (allow installation from unknown sources).

### Step 4: Start Metro on PC & connect
1. Start the development server on your computer:
   ```bash
   npx expo start --dev-client
   ```
2. Open the newly installed **Zovibe** app on your phone.
3. It will display the development client screen:
   - Scan the QR code displayed in your terminal using the built-in scanner in the app, OR
   - Tap your local Metro server listed under "Development servers".

---

## 📱 Method 3: Connecting via Wi-Fi (Wireless Mode)

To develop wirelessly over Wi-Fi without a USB cable:

### Step 1: Ensure phone and PC are on the same Wi-Fi network
Your computer and phone must share the same local network subnet (make sure your PC's network profile is not set to "Public Network" with strict isolation).

### Step 2: Start Metro with host IP
```bash
npx expo start --dev-client --host lan
```
If you experience firewall or router isolation issues, use tunnel mode:
```bash
npx expo start --dev-client --tunnel
```

### Step 3: Connect
Open the Zovibe Dev Client app on your phone and scan the QR code in your terminal.

---

## 🧪 Can I run with standard Expo Go (`npx expo start --go`)?

If you try to run:
```bash
npx expo start --go
```
and scan it with the standard Expo Go app from Google Play:

> **Expected Outcome**:
> The JavaScript bundle will download to your phone, but it will immediately throw:
> ```text
> Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'TrackPlayer' could not be found.
> ```
> To run under standard Expo Go without native builds, `react-native-track-player` and `react-native-fast-image` must be temporarily replaced or mocked with pure JavaScript / Expo-compatible alternatives (like `expo-av` or React Native's built-in `<Image />`).
> For full functionality (audio streaming, background playback, and lock screen controls), **use Method 1 or Method 2**.

---

## 🔧 Useful Development Commands

| Command | Description |
|---|---|
| `npm run start` | Starts Metro bundler for development client (`expo start --dev-client`) |
| `npx expo start -c` | Clears Metro cache and starts the dev server (use if bundle is stuck) |
| `npx expo start --dev-client --tunnel` | Starts Metro with an ngrok tunnel (bypasses Wi-Fi / firewall blocks) |
| `npm run android` | Compiles native code and runs on connected USB phone or emulator |
| `adb reverse tcp:8081 tcp:8081` | Maps mobile port 8081 to PC port 8081 via USB cable |
| `.\android\gradlew.bat --stop` | Stops background Gradle daemons if files or ports are locked |
| `npx tsc --noEmit` | Validates TypeScript types across the entire project |

---

## ⚡ Troubleshooting Checklist

### 1. "Could not connect to development server"
- If using USB: run `adb reverse tcp:8081 tcp:8081` and restart Metro.
- If using Wi-Fi: check if Windows Firewall is blocking Node.js on port 8081. Temporarily allow Node through the firewall or use `--tunnel`.

### 2. "Resource busy or locked (EBUSY)" during npm install or build
- Windows Gradle daemons or Java processes can hold file locks.
- Stop Gradle daemons:
  ```powershell
  .\android\gradlew.bat --stop
  ```

### 3. Cleartext HTTP Traffic error on Android
- In `app.json`, `android.usesCleartextTraffic: true` is already configured in `expo-build-properties` to allow audio streaming over HTTP/HTTPS proxies.

### 4. Audio doesn't play
- Verify `https://zovibe-app.vercel.app` is reachable in your mobile browser.
- Ensure device volume is up and battery saver is not killing the foreground service.

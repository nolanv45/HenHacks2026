# HenHacks Mobile (React Native + OpenCV)

Fresh React Native TypeScript starter with:

- `react-native-vision-camera` for camera input
- `react-native-fast-opencv` for OpenCV processing
- `react-native-worklets-core` and `react-native-reanimated` for real-time frame-processing pipeline support

## Requirements

- Node 18+
- Android Studio (SDK + emulator) for Android
- Xcode + CocoaPods for iOS (macOS only)

## Install

```bash
npm install
```

For iOS (macOS):

```bash
cd ios
pod install
cd ..
```

## Run

Start Metro:

```bash
npm start
```

In another terminal:

```bash
npm run android
```

or (macOS):

```bash
npm run ios
```

## What is prewired

- Camera permission request and preview in `App.tsx`
- Android camera permission in `android/app/src/main/AndroidManifest.xml`
- iOS camera permission description in `ios/HenHacksMobile/Info.plist`
- Babel plugins enabled in `babel.config.js` for Reanimated + Worklets
- Android frame processor flag in `android/gradle.properties`

## Next step for true real-time CV

The current app includes an OpenCV sanity check (button) and a live camera preview.
To move to full real-time processing, add a VisionCamera frame processor and run OpenCV operations per frame, then render overlays from processed results.

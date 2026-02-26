# Google Maps Setup Guide

This guide explains how to set up Google Maps API key for the Distance Alarm app to work on Android APK builds.

## Why is this needed?

The map works fine in Expo Go because Expo provides a built-in Google Maps API key. However, when you build an APK for release, you need to provide your own Google Maps API key.

## Steps to Get Google Maps API Key

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Enter project name: `Distance Alarm`
4. Click "Create"

### 2. Enable Google Maps Android API

1. In the console, go to "APIs & Services" → "Library"
2. Search for "Maps SDK for Android"
3. Click on it and press "Enable"
4. Wait for it to be enabled

### 3. Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. A new API key will be created (copy this key)
4. Click "Edit API Key" to add restrictions
5. Under "Application restrictions", select "Android apps"
6. Click "Add an item"

### 4. Get Your App's SHA-1 Fingerprint

Run this command to get your app's SHA-1 fingerprint:

```bash
# For development/debug key
cd ~/.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android

# For production key (if you have one)
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

Copy the SHA-1 value.

### 5. Configure API Key Restrictions

In Google Cloud Console API Key restrictions:

1. Paste your SHA-1 fingerprint
2. Add your app package name: `com.distancealarm.app`
3. Click "Done" and "Save"

### 6. Add API Key to app.json

Open `app.json` and locate the Android section. Update the `googleMapsApiKey`:

```json
"android": {
  ...
  "googleMapsApiKey": "YOUR_API_KEY_HERE"
}
```

Replace `YOUR_API_KEY_HERE` with your actual API key.

### 7. Rebuild the APK

```bash
# Build a new APK
eas build -p android --profile preview

# Or build locally
eas build -p android --profile local --local
```

## Troubleshooting

### Map Still Not Showing

1. **Check API Key**: Verify you copied the full API key correctly
2. **Check SHA-1**: Make sure SHA-1 fingerprint matches your keystore
3. **Check Package Name**: Ensure package name is `com.distancealarm.app`
4. **Billing**: Enable billing on Google Cloud Project (required for Maps API)
5. **Wait**: Sometimes it takes 5-10 minutes for API key to be active

### "Google Play Services" Error

Make sure Google Play Services is installed on the test Android device:

1. Open Google Play Store
2. Search for "Google Play Services"
3. Install/Update if needed

## Security Notes

- Keep your API key private - don't share it in public repositories
- Consider using API key restrictions (IP, referrer, etc.)
- Rotate keys periodically
- Monitor API usage in Google Cloud Console

## Enable Billing (Important)

Maps API requires billing to be enabled:

1. In Google Cloud Console, go to "Billing"
2. Create a billing account if you don't have one
3. Link it to your project
4. Enable billing for the project

You won't be charged for normal usage if you stay within the free tier limits.

## References

- [Google Maps API Documentation](https://developers.google.com/maps/documentation/android-sdk)
- [Expo react-native-maps Documentation](https://docs.expo.dev/versions/latest/sdk/map-view/)
- [EAS Build Documentation](https://docs.expo.dev/build/setup/)

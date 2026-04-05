# Map Provider Note

The app no longer uses Google Maps or a paid Google Maps API key.

## Current setup

- Native map rendering now uses an OpenStreetMap tile layer inside a WebView.
- `app.json` does not need `googleMapsApiKey`.
- APK builds do not require Google billing setup for map display.

## Rebuild after dependency change

```bash
npm install
eas build -p android --profile preview
```

## Important note

OpenStreetMap tiles are free to use, but the map still needs internet access to load tiles on the device.

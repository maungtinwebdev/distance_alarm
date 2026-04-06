# Distance Alarm — Project Instruction

## Overview

**Distance Alarm** is a React Native (Expo SDK 54) mobile application that alerts users when they arrive within a configurable radius of a chosen destination. The destination can be set by **tapping the map** or by **searching for a bus stop by name**. The app also **auto-detects nearby bus stops** in the background and notifies the user as they approach them.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React Native 0.81 + Expo SDK 54 |
| Map | Leaflet.js inside `react-native-webview` |
| UI Components | `react-native-paper` (Material Design 3) |
| Storage | `@react-native-async-storage/async-storage` |
| Audio | `expo-audio` (dev/production builds only) |
| Location | `expo-location` + `expo-task-manager` (background) |
| Notifications | `expo-notifications` (dev/production builds only) |

---

## Project Structure

```
src/
├── components/
│   └── MapComponent.js        # WebView-based Leaflet map
├── screens/
│   └── HomeScreen.js          # Main UI — map, controls, search, settings
├── services/
│   ├── BusStopService.js      # Overpass & Nominatim API calls
│   ├── LocationTask.js        # Background location task definition
│   └── SoundService.js        # Alarm sounds, vibration, notifications
└── utils/
    ├── location.js            # Haversine distance helper
    └── runtime.js             # Expo Go detection flag
```

---

## Core Features

### 1. Set Destination by Map Tap

- When **not tracking**, tap anywhere on the map to drop a red destination marker.
- The selected coordinates are displayed in a "SELECTED DESTINATION" card.

### 2. Search Bus Stop by Name (Nominatim API)

- A search input appears when tracking is **not** active.
- Uses the **Nominatim API** (`nominatim.openstreetmap.org`) with `User-Agent: DistanceAlarmApp/1.0`.
- Input is **debounced** (500 ms) to avoid excessive API calls.
- Results render in a scrollable list; selecting one sets it as the destination and displays its name.

### 3. Distance Alarm (Foreground + Background)

- User sets a **radius** (quick presets: 100 m, 500 m, 1 km, 5 km, or custom input).
- Pressing **Start Tracking** begins location monitoring:
  - **Foreground:** `expo-location` watcher updates the UI every few seconds.
  - **Background:** `expo-task-manager` + `expo-location` run a task that independently checks distance and fires a push notification when within the alarm radius.
- On arrival the app plays an **alarm song** (looping MP3 via `expo-audio`) and triggers continuous device vibration.
- The alarm stops when the user taps the notification or presses **Stop Tracking**.

### 4. Auto-Detect Nearby Bus Stops (Overpass API)

- While tracking, the app queries the **Overpass API** for nearby bus stops every location update (throttled: 15 s cooldown, 200 m movement threshold).
- Tags queried: `highway=bus_stop`, `public_transport=platform` (bus=yes), `amenity=bus_station`.
- The nearest and next bus stop names are shown in a green info card.
- Background task also detects bus stops and sends a notification when the user is within **150 m** of one (deduplicated by stop ID).

### 5. Settings Modal

- **Alarm Sound:** Choose from Bell, Alarm Clock, Chime, Beep, Siren, or Song.
- **Vibration Pattern:** Light / Medium / Heavy / Intense / Custom duration.
- **Dark Mode:** Toggle theme (persisted to AsyncStorage).

---

## API Details

### Overpass API (Bus Stop Auto-Detection)

- **Endpoint:** `https://overpass-api.de/api/interpreter`
- **Method:** POST with `Content-Type: application/x-www-form-urlencoded`
- **Throttling:** 15 s cooldown + 200 m movement threshold to prevent rate-limiting.
- **Cache:** In-memory; stops are re-sorted by distance when the user moves within the cooldown window.

### Nominatim API (Bus Stop Search)

- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Params:** `q=<query> bus stop`, `format=json`, `limit=10`, `addressdetails=1`
- **Header:** `User-Agent: DistanceAlarmApp/1.0` (required by Nominatim usage policy).
- **Debounce:** 500 ms on the client side.

---

## Known Issues & Bugs

### 1. `[TypeError: Network request failed]` during bus stop search

- **Cause:** Nominatim enforces strict rate limits and requires a proper `User-Agent`.
- **Current mitigation:** The header is set, but rapid or concurrent searches may still hit limits.
- **Fix needed:** Add exponential retry logic with a max of 2 retries and surface user-friendly error feedback (e.g., "Search unavailable, try again").

### 2. `VirtualizedLists should never be nested inside plain ScrollViews`

- **Cause:** The `FlatList` for search results (line ~628 in HomeScreen.js) is inside a `ScrollView` wrapper for the controls panel.
- **Fix needed:** Replace the `FlatList` with a plain `View` + `.map()` rendering since the result set is small (max 10 items) and doesn't need virtualization:

```jsx
{busStopResults.length > 0 && (
  <Surface style={styles.searchResults} elevation={3}>
    <View style={{ maxHeight: 180 }}>
      {busStopResults.map((item, index) => (
        <React.Fragment key={`${item.lat}-${item.lon}-${index}`}>
          {index > 0 && <Divider />}
          <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => handleSelectSearchResult(item)}
          >
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }} numberOfLines={1}>
              🚏 {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }} numberOfLines={1}>
              {item.displayName}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  </Surface>
)}
```

### 3. Expo Go Limitations

- `expo-audio`, `expo-notifications`, and background location tasks are **not fully supported** in Expo Go.
- The app guards these calls with `isExpoGo` checks and falls back to foreground-only vibration alarm.
- **For full functionality**, use a development build (`npx expo run:android` or EAS build).

---

## How to Run

```bash
# Install dependencies
npm install

# Start in offline mode (default)
npm run start

# Start with online bundler
npm run start:online

# Build APK for testing
npm run build:apk

# Build local APK
npm run build:local
```

---

## Data Flow

```
User taps map / selects search result
        │
        ▼
  setDestination(coords)
        │
        ▼
  User presses "Start Tracking"
        │
        ├──► AsyncStorage: save targetLocation, alarmRadius, isTracking
        │
        ├──► expo-location: start background task (LocationTask.js)
        │
        └──► expo-location: start foreground watcher
                    │
                    ▼
              On each location update:
                ├── Calculate distance to destination
                ├── Update UI (distance card)
                ├── Auto-detect bus stops (Overpass API, throttled)
                └── If distance ≤ radius → trigger alarm
                        │
                        ├── playAlarmSong() → expo-audio loop + vibration
                        ├── sendAlarmNotification() → push notification
                        └── stopTracking() → clean up everything
```

---

## Future Improvements

1. **Retry logic for Nominatim API** — exponential backoff with max 2 retries.
2. **Replace FlatList with View.map()** — fix the nested VirtualizedList warning.
3. **Offline bus stop cache** — persist recently fetched stops to AsyncStorage for offline use.
4. **Multiple alarm destinations** — allow users to set more than one destination in a trip.
5. **Route display** — draw a polyline from current location to destination on the map.
6. **Custom alarm sounds** — let users pick audio files from their device.
7. **Localization** — add Burmese (Myanmar) language support.
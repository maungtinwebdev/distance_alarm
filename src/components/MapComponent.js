import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Alert } from 'react-native';
import { WebView } from 'react-native-webview';

export const PROVIDER_DEFAULT = 'openstreetmap';

const escapeHtml = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

const buildMapHtml = (config) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
      }

      body {
        background: #e9eef3;
      }

      /* Hide Leaflet attribution text to save space, keep logo */
      .leaflet-control-attribution {
        font-size: 9px !important;
        background: rgba(255,255,255,0.7) !important;
        backdrop-filter: blur(4px);
        border-radius: 4px 0 0 0;
        padding: 2px 6px !important;
      }

      .leaflet-control-zoom {
        border: none !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        border-radius: 10px !important;
        overflow: hidden;
      }

      .leaflet-control-zoom a {
        background: rgba(255,255,255,0.92) !important;
        backdrop-filter: blur(8px);
        color: #333 !important;
        border-bottom: 1px solid rgba(0,0,0,0.08) !important;
        width: 36px !important;
        height: 36px !important;
        line-height: 36px !important;
        font-size: 18px !important;
      }

      .leaflet-control-zoom a:last-child {
        border-bottom: none !important;
      }

      .leaflet-control-zoom a:hover {
        background: rgba(255,255,255,1) !important;
      }

      /* Pulse ring for current user location */
      @keyframes pulseRing {
        0%   { transform: scale(1);   opacity: 0.5; }
        100% { transform: scale(2.5); opacity: 0; }
      }

      .user-pulse {
        width: 24px;
        height: 24px;
        position: relative;
      }

      .user-pulse::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(43, 138, 255, 0.35);
        animation: pulseRing 2s ease-out infinite;
      }

      .user-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #2B8AFF;
        border: 2.5px solid #fff;
        box-shadow: 0 1px 6px rgba(43, 138, 255, 0.5);
      }

      .dest-marker {
        width: 20px;
        height: 20px;
        position: relative;
      }

      .dest-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #E53935;
        border: 2.5px solid #fff;
        box-shadow: 0 1px 6px rgba(229, 57, 53, 0.5);
      }

      .dest-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(229, 57, 53, 0.15);
      }

      .bus-marker {
        width: 20px;
        height: 20px;
        background-color: #fff;
        border: 2px solid #43A047;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const initialConfig = ${escapeHtml(config)};
      const state = {
        map: null,
        userMarker: null,
        destinationMarker: null,
        alarmCircle: null,
        busStopMarkers: [],
        initialViewApplied: false,
      };

      function postMessage(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function createMap(config) {
        const fallbackCenter = [
          config.initialRegion.latitude,
          config.initialRegion.longitude,
        ];

        state.map = L.map('map', {
          zoomControl: true,
          attributionControl: true,
        }).setView(fallbackCenter, 15);

        // Use CartoDB Positron for a cleaner, more modern look
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '\\u00a9 <a href="https://www.openstreetmap.org/copyright">OSM</a> \\u00a9 <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
        }).addTo(state.map);

        state.map.on('click', function (event) {
          postMessage({
            type: 'map-press',
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });

        updateMap(config);
      }

      function updateMap(config) {
        if (!state.map) {
          return;
        }

        // ── User marker with pulse ──
        if (config.currentLocation) {
          const latlng = [config.currentLocation.latitude, config.currentLocation.longitude];

          if (!state.userMarker) {
            const icon = L.divIcon({
              className: 'user-pulse',
              html: '<div class="user-dot"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            state.userMarker = L.marker(latlng, { icon: icon, zIndexOffset: 1000 }).addTo(state.map);
          } else {
            state.userMarker.setLatLng(latlng);
          }
        } else if (state.userMarker) {
          state.map.removeLayer(state.userMarker);
          state.userMarker = null;
        }

        // ── Destination marker ──
        if (config.destination) {
          const latlng = [config.destination.latitude, config.destination.longitude];

          if (!state.destinationMarker) {
            const icon = L.divIcon({
              className: 'dest-marker',
              html: '<div class="dest-ring"></div><div class="dest-dot"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            state.destinationMarker = L.marker(latlng, { icon: icon, zIndexOffset: 900 }).addTo(state.map);
          } else {
            state.destinationMarker.setLatLng(latlng);
          }
        } else if (state.destinationMarker) {
          state.map.removeLayer(state.destinationMarker);
          state.destinationMarker = null;
        }

        const bounds = [];
        if (config.currentLocation) bounds.push([config.currentLocation.latitude, config.currentLocation.longitude]);
        if (config.destination) bounds.push([config.destination.latitude, config.destination.longitude]);

        // ── Alarm radius circle ──
        if (state.alarmCircle) {
          state.map.removeLayer(state.alarmCircle);
          state.alarmCircle = null;
        }

        if (config.destination && config.alarmRadius > 0) {
          state.alarmCircle = L.circle(
            [config.destination.latitude, config.destination.longitude],
            {
              radius: config.alarmRadius,
              color: 'rgba(43, 138, 255, 0.6)',
              fillColor: 'rgba(43, 138, 255, 0.08)',
              fillOpacity: 0.5,
              weight: 2,
              dashArray: '6, 4',
            }
          ).addTo(state.map);
        }

        // ── Bus stops ──
        state.busStopMarkers.forEach(m => state.map.removeLayer(m));
        state.busStopMarkers = [];
        
        if (config.busStops && config.busStops.length > 0) {
          const bsIcon = L.divIcon({
            className: 'bus-marker',
            html: '🚌',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          
          config.busStops.forEach(stop => {
            const latlng = [stop.lat || stop.latitude, stop.lon || stop.longitude];
            // Don't render a bus stop exactly where the destination is
            if (config.destination && Math.abs(latlng[0] - config.destination.latitude) < 0.0001 && Math.abs(latlng[1] - config.destination.longitude) < 0.0001) {
              return;
            }
            const m = L.marker(latlng, { icon: bsIcon }).addTo(state.map);
            if (stop.name) m.bindPopup(stop.name);
            state.busStopMarkers.push(m);
            bounds.push(latlng); // Add bus stop to bounds to fit screen
          });
        }

        // ── Initial bounds ──
        if (!state.initialViewApplied && bounds.length > 0) {
          if (bounds.length > 1) {
            state.map.fitBounds(bounds, { padding: [48, 48] });
          } else if (bounds.length === 1) {
            state.map.setView(bounds[0], 15);
          }

          state.initialViewApplied = true;
        } else if (state.initialViewApplied && config.busStops && config.busStops.length > 0 && bounds.length > 0) {
          if (bounds.length > 1) {
            state.map.fitBounds(bounds, { padding: [48, 48] });
          }
        }
      }

      window.__distanceAlarmUpdateMap = updateMap;

      function handleIncomingMessage(event) {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'update') {
            updateMap(payload.config);
          }
        } catch (error) {
          postMessage({ type: 'map-error', message: error.message });
        }
      }

      document.addEventListener('message', handleIncomingMessage);
      window.addEventListener('message', handleIncomingMessage);
      window.addEventListener('error', function (event) {
        postMessage({ type: 'map-error', message: event.message });
      });

      createMap(initialConfig);
    </script>
  </body>
</html>`;

const MapComponent = forwardRef(
  (
    {
      style,
      initialRegion,
      currentLocation,
      destination,
      alarmRadius = 0,
      busStops = [],
      onPress,
    },
    ref
  ) => {
    const webViewRef = useRef(null);
    const initialHtmlRef = useRef(buildMapHtml({
      initialRegion,
      currentLocation,
      destination,
      alarmRadius,
      busStops,
    }));

    const mapConfig = useMemo(
      () => ({
        initialRegion,
        currentLocation,
        destination,
        alarmRadius,
        busStops,
      }),
      [alarmRadius, currentLocation, destination, initialRegion, busStops]
    );

    useImperativeHandle(ref, () => ({
      reload: () => webViewRef.current?.reload(),
    }));

    useEffect(() => {
      if (!webViewRef.current) {
        return;
      }

      webViewRef.current.injectJavaScript(`
        if (window.__distanceAlarmUpdateMap) {
          window.__distanceAlarmUpdateMap(${escapeHtml(mapConfig)});
        }
        true;
      `);
    }, [mapConfig]);

    const handleMessage = useCallback(
      (event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);

          if (message.type === 'map-press' && onPress) {
            onPress({
              nativeEvent: {
                coordinate: {
                  latitude: message.latitude,
                  longitude: message.longitude,
                },
              },
            });
          }

          if (message.type === 'map-error') {
            throw new Error(message.message);
          }
        } catch (error) {
          console.error('Map Error:', error);
          Alert.alert(
            'Map Error',
            'Failed to load the map view. Please check your internet connection.'
          );
        }
      },
      [onPress]
    );

    if (!initialRegion) {
      return null;
    }

    return (
      <WebView
        ref={webViewRef}
        style={style}
        originWhitelist={['*']}
        source={{ html: initialHtmlRef.current }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
      />
    );
  }
);

MapComponent.displayName = 'MapComponent';

export default MapComponent;

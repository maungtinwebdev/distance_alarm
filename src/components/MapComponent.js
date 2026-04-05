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

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
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

      function setMarker(markerRef, coords, options) {
        if (!coords) {
          if (markerRef.current) {
            state.map.removeLayer(markerRef.current);
            markerRef.current = null;
          }
          return;
        }

        if (!markerRef.current) {
          markerRef.current = L.circleMarker([coords.latitude, coords.longitude], options).addTo(state.map);
        } else {
          markerRef.current.setLatLng([coords.latitude, coords.longitude]);
          markerRef.current.setStyle(options);
        }
      }

      function updateMap(config) {
        if (!state.map) {
          return;
        }

        const userMarkerRef = { current: state.userMarker };
        const destinationMarkerRef = { current: state.destinationMarker };

        setMarker(userMarkerRef, config.currentLocation, {
          radius: 8,
          color: '#1f7ef0',
          fillColor: '#1f7ef0',
          fillOpacity: 1,
          weight: 2,
        });

        setMarker(destinationMarkerRef, config.destination, {
          radius: 8,
          color: '#dc3545',
          fillColor: '#dc3545',
          fillOpacity: 1,
          weight: 2,
        });

        state.userMarker = userMarkerRef.current;
        state.destinationMarker = destinationMarkerRef.current;

        if (state.alarmCircle) {
          state.map.removeLayer(state.alarmCircle);
          state.alarmCircle = null;
        }

        if (config.destination && config.alarmRadius > 0) {
          state.alarmCircle = L.circle(
            [config.destination.latitude, config.destination.longitude],
            {
              radius: config.alarmRadius,
              color: 'rgba(220, 53, 69, 0.8)',
              fillColor: 'rgba(220, 53, 69, 0.15)',
              fillOpacity: 0.4,
              weight: 2,
            }
          ).addTo(state.map);
        }

        if (!state.initialViewApplied) {
          const bounds = [];

          if (config.currentLocation) {
            bounds.push([config.currentLocation.latitude, config.currentLocation.longitude]);
          }

          if (config.destination) {
            bounds.push([config.destination.latitude, config.destination.longitude]);
          }

          if (bounds.length > 1) {
            state.map.fitBounds(bounds, { padding: [48, 48] });
          } else if (bounds.length === 1) {
            state.map.setView(bounds[0], 15);
          }

          state.initialViewApplied = true;
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
    }));

    const mapConfig = useMemo(
      () => ({
        initialRegion,
        currentLocation,
        destination,
        alarmRadius,
      }),
      [alarmRadius, currentLocation, destination, initialRegion]
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
            'Failed to load the OpenStreetMap view. Please verify your internet connection and try again.'
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

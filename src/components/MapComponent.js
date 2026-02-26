
import React from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

export { Marker, Circle, PROVIDER_GOOGLE };

// Custom MapView wrapper with error handling
const MapComponent = React.forwardRef((props, ref) => {
  const handleMapError = (error) => {
    console.error('Map Error:', error);
    Alert.alert(
      'Map Error',
      'Failed to load map. Please ensure:\n1. Google Maps API key is configured\n2. Location permissions are granted\n3. You have internet connection'
    );
  };

  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      onError={handleMapError}
      {...props}
    />
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;

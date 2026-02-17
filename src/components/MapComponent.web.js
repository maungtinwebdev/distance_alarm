
import React from 'react';
import { View, Text } from 'react-native';

export const Marker = () => null;
export const Circle = () => null;
export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

const MapView = (props) => {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee'}}>
      <Text>Map View is not supported on web</Text>
    </View>
  );
};

export default MapView;

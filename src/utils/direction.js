
/**
 * Calculate bearing from point 1 to point 2.
 * Returns bearing in degrees (0-360, where 0=North, 90=East).
 */
export const getBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Angular difference between two bearings (0-180).
 */
export const getAngularDifference = (b1, b2) => {
  let diff = Math.abs(b1 - b2);
  return diff > 180 ? 360 - diff : diff;
};

/**
 * Compass direction label for a bearing.
 */
export const getDirectionLabel = (bearing) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
};

/**
 * Predict the next bus stop based on user's movement direction.
 * Looks for the closest stop that is roughly ahead of the user (<90°).
 */
export const predictNextStop = (prevLocation, currentLocation, stops) => {
  if (!stops || stops.length < 2) {
    return stops && stops.length > 1 ? stops[1] : null;
  }

  if (!prevLocation || !currentLocation) {
    return stops[1] || null;
  }

  const userBearing = getBearing(
    prevLocation.latitude, prevLocation.longitude,
    currentLocation.latitude, currentLocation.longitude
  );

  const nearest = stops[0];

  const stopsAhead = stops
    .filter(s => s.id !== nearest.id)
    .map(s => ({
      ...s,
      angleDiff: getAngularDifference(
        userBearing,
        getBearing(currentLocation.latitude, currentLocation.longitude, s.lat, s.lon)
      ),
    }))
    .filter(s => s.angleDiff < 90)
    .sort((a, b) => a.distance - b.distance);

  return stopsAhead.length > 0 ? stopsAhead[0] : stops[1] || null;
};

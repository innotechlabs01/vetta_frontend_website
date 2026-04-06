import { useCallback, useEffect, useState } from 'react';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGeolocationState {
  coords: GeolocationCoords | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutos
  } = options;

  const [state, setState] = useState<UseGeolocationState>({
    coords: null,
    error: null,
    isLoading: false,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const getLocation = useCallback(() => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Geolocalización no soportada en este navegador' },
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          error: null,
          isLoading: false,
          isSupported: true,
        });
      },
      (error) => {
        let message = 'Error desconocido';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Ubicación no disponible';
            break;
          case error.TIMEOUT:
            message = 'Tiempo de espera agotado';
            break;
        }
        setState(prev => ({
          ...prev,
          error: { code: error.code, message },
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [enableHighAccuracy, maximumAge, state.isSupported, timeout]);

  const clearLocation = useCallback(() => {
    setState(prev => ({
      ...prev,
      coords: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    getLocation,
    clearLocation,
    canGetLocation: state.isSupported && !state.isLoading,
  };
}

export function useGeolocationWatcher(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    maximumAge = 300000,
  } = options;

  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const startWatching = useCallback(() => {
    if (!isSupported) return;

    setIsWatching(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
        setError(null);
      },
      (error) => {
        let message = 'Error desconocido';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permiso de ubicación denegado';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Ubicación no disponible';
            break;
        }
        setError({ code: error.code, message });
      },
      {
        enableHighAccuracy,
        maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsWatching(false);
    };
  }, [enableHighAccuracy, maximumAge, isSupported]);

  const stopWatching = useCallback(() => {
    setIsWatching(false);
  }, []);

  return {
    coords,
    error,
    isWatching,
    startWatching,
    stopWatching,
    isSupported,
  };
}

export async function getCurrentPosition(): Promise<GeolocationCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

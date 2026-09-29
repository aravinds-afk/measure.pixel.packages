import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** `true` unless we positively know the device is offline. */
export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
  }, []);
  return { isOnline };
}

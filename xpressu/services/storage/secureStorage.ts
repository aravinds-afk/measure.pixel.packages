/**
 * Encrypted key-value storage.
 *  - iOS: Keychain, Android: Keystore-backed (via expo-secure-store).
 *  - Web (dev/testing only): localStorage.
 *
 * SecureStore is intended for small values, so large values are split into
 * chunks transparently.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const PREFIX = 'xpressu.';

const isWeb = Platform.OS === 'web';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function rawGet(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key, options);
}

async function rawSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage unavailable (private mode) — fail silently; data is non-critical on web.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, options);
}

async function rawDelete(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key, options);
}

function k(key: string) {
  return PREFIX + key;
}

export async function getString(key: string): Promise<string | null> {
  const head = await rawGet(k(key));
  if (head === null) return null;
  const match = /^__chunks:(\d+)$/.exec(head);
  if (!match) return head;
  const count = Number(match[1]);
  const parts = await Promise.all(Array.from({ length: count }, (_, i) => rawGet(k(`${key}.c${i}`))));
  if (parts.some((p) => p === null)) return null;
  return parts.join('');
}

export async function setString(key: string, value: string): Promise<void> {
  await removeItem(key);
  if (value.length <= CHUNK_SIZE) {
    await rawSet(k(key), value);
    return;
  }
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    await rawSet(k(`${key}.c${i}`), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await rawSet(k(key), `__chunks:${count}`);
}

export async function removeItem(key: string): Promise<void> {
  const head = await rawGet(k(key));
  const match = head ? /^__chunks:(\d+)$/.exec(head) : null;
  if (match) {
    const count = Number(match[1]);
    await Promise.all(Array.from({ length: count }, (_, i) => rawDelete(k(`${key}.c${i}`))));
  }
  await rawDelete(k(key));
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getString(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setString(key, JSON.stringify(value));
}

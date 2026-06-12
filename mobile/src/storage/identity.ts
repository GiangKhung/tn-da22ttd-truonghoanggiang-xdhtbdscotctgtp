import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gara.identity.v1';

export type Identity = {
  customerName?: string;
  phone: string;
  licensePlate: string;
};

export async function loadIdentity(): Promise<Identity | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.phone || !parsed?.licensePlate) return null;
    return parsed as Identity;
  } catch {
    return null;
  }
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(identity));
}

export async function clearIdentity(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

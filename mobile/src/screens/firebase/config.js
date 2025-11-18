import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDS1K8BtBeoViQxmZ8lDQGx1YPe0Z3Kx9I',
  authDomain: 'balanceme-874de.firebaseapp.com',
  projectId: 'balanceme-874de',
  storageBucket: 'balanceme-874de.appspot.com',
  messagingSenderId: '977152113995',
  appId: '1:977152113995:web:d4561c9feb8aed230cfcce',
  measurementId: 'G-MYFP6MTY7J',
};

const app = initializeApp(firebaseConfig);

let auth;

if (Platform.OS === 'web') {
  // En web usamos la auth por defecto del SDK.
  auth = getAuth(app);
} else if (
  typeof initializeAuth === 'function' &&
  typeof getReactNativePersistence === 'function'
) {
  // En React Native usamos AsyncStorage para persistir la sesión.
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  // Fallback en caso de que la versión de Firebase no exponga las APIs anteriores.
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

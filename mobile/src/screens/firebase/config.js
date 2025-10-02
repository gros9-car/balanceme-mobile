import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, db, storage };

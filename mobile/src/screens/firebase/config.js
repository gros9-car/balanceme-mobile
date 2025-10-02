// Importa las funciones que necesitas de los SDKs que vas a usar
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Agrega los SDKs de los productos de Firebase que quieras usar
// https://firebase.google.com/docs/web/setup#available-libraries

// Configuración de Firebase de tu aplicación web
// Para Firebase JS SDK v7.20.0 y posteriores, measurementId es opcional
const firebaseConfig = {
  apiKey: "AIzaSyDS1K8BtBeoViQxmZ8lDQGx1YPe0Z3Kx9I",
  authDomain: "balanceme-874de.firebaseapp.com",
  projectId: "balanceme-874de",
  storageBucket: "balanceme-874de.appspot.com",
  messagingSenderId: "977152113995",
  appId: "1:977152113995:web:d4561c9feb8aed230cfcce",
  measurementId: "G-MYFP6MTY7J"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
// Nota: No se usa getAnalytics para compatibilidad con web
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db };
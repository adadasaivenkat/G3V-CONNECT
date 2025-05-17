import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWhmI6Fww8QzraTOxAp3mmDZKmSdG_Er4",
  authDomain: "g3v-connect.firebaseapp.com",
  projectId: "g3v-connect",
  storageBucket: "login-auth-2e9b9.appspot.com",
  messagingSenderId: "158759198133",
  appId: "1:158759198133:web:dd3f5787ba9c4a22c68dfc",
  measurementId: "G-65HQXF8HY2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);

export { auth, db };
export default app;

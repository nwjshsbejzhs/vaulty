import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBD202YQyRGa7PUE9kh8o-bQQciAO8Lwc8",
  authDomain: "glowearth-f0801.firebaseapp.com",
  projectId: "glowearth-f0801",
  storageBucket: "glowearth-f0801.firebasestorage.app",
  messagingSenderId: "11001317302",
  appId: "1:11001317302:web:db00d5dd1cf0fabf862317",
  measurementId: "G-X992GXP4P7",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

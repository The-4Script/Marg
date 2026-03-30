import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA050GFqyY7o_ZwEiZXSvG7pDXkf20qkbg",
  authDomain: "marg-seven.firebaseapp.com",
  projectId: "marg-seven",
  storageBucket: "marg-seven.firebasestorage.app",
  messagingSenderId: "239013306446",
  appId: "1:239013306446:web:78af42ab6a0d5dd66e231f",
  measurementId: "G-V8K8BP0X21"
};

// Initialize Firebase
let app;
let db;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
} else {
  app = getApp();
  db = getFirestore(app);
}

const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();

export { app, auth, db, googleAuthProvider };

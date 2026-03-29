import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleAuthProvider = new GoogleAuthProvider();

// Initialize Analytics only on the client side
let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported: boolean) => {
    if (supported) analytics = getAnalytics(app);
  });
}

export { app, auth, db, googleAuthProvider, analytics };

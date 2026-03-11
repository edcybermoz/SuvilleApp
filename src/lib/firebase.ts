import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAQdscHLria6BRH9_sRhXx1SC7JTi48lHc",
  authDomain: "villesysapp.firebaseapp.com",
  projectId: "villesysapp",
  storageBucket: "villesysapp.firebasestorage.app",
  messagingSenderId: "642269861870",
  appId: "1:642269861870:web:49024b0e61f712b8bce0ff",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import Constants from 'expo-constants';

// Get Firebase config from app.config.ts (extra)
const extra = Constants.expoConfig?.extra;

const firebaseConfig = {
    apiKey: extra?.firebaseApiKey,
    authDomain: extra?.firebaseAuthDomain,
    projectId: extra?.firebaseProjectId,
    storageBucket: extra?.firebaseStorageBucket,
    messagingSenderId: extra?.firebaseMessagingSenderId,
    appId: extra?.firebaseAppId,
};

let app: FirebaseApp;
let auth: Auth;

// Initialize Firebase
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Get Auth instance (persistence is handled automatically in React Native/Expo)
auth = getAuth(app);

export { app, auth };

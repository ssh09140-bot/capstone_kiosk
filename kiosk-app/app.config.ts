import 'dotenv/config';

export default {
  "expo": {
    "name": "kiosk-app",
    "slug": "kiosk-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "kioskapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "EXPO_PUBLIC_API_URL": process.env.EXPO_PUBLIC_API_URL,
      "firebaseApiKey": process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      "firebaseAuthDomain": process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      "firebaseProjectId": process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      "firebaseStorageBucket": process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      "firebaseMessagingSenderId": process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      "firebaseAppId": process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
};
import 'dotenv/config'; // Import dotenv to load environment variables

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
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    // Add the extra field to expose environment variables
    "extra": {
      "EXPO_PUBLIC_API_URL": process.env.EXPO_PUBLIC_API_URL,
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID" // Placeholder, user might need to fill this
      }
    }
  }
};
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';

// Get the API URL from environment variables or Expo config
const getBaseUrl = () => {
  const url = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    console.warn('API URL not found in environment variables. Defaulting to 10.0.2.2 (Android Emulator).');
    return 'http://10.0.2.2:3000';
  }
  return url;
};

export const BACKEND_URL = getBaseUrl();

const baseURL = BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`;
console.log('API Base URL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add Token and Store ID
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storeId = await AsyncStorage.getItem('storeId');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (storeId) {
        config.headers['X-Store-Id'] = storeId;
      }
    } catch (error) {
      console.error('Error reading from AsyncStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Errors (e.g., 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized. Logging out...');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('storeId');

      Alert.alert(
        '세션 만료',
        '인증 정보가 만료되었습니다. 다시 로그인해주세요.',
        [
          {
            text: '확인',
            onPress: () => {
              // Use router.replace to reset navigation stack if possible, 
              // but since this is outside a component, we might need a navigation ref service 
              // or just rely on the user to restart if the app doesn't auto-navigate.
              // For Expo Router, we can try importing router, but it might not work outside components in all versions.
              // Safe fallback: The user sees the alert and the next action will likely fail or redirect.
              try {
                router.replace('/login');
              } catch (e) {
                console.error("Navigation failed:", e);
              }
            }
          }
        ]
      );
    }
    return Promise.reject(error);
  }
);

export default api;

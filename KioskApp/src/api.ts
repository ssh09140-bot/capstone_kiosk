import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { API_BASE_URL } from '@env'; // This will be provided by react-native-dotenv or similar setup

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include storeId in headers
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken'); // Assuming you store the JWT as 'userToken'
    const storeId = await AsyncStorage.getItem('storeId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (storeId) {
      config.headers['X-Store-Id'] = storeId; // Custom header for storeId
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

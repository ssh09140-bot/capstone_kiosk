import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartProvider } from '../context/CartContext';

// 앱이 켜지는 동안 스플래시 화면이 사라지지 않도록 설정
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.error("Failed to load auth token", e);
        setIsAuthenticated(false);
      } finally {
        if (fontsLoaded || fontError) {
          SplashScreen.hideAsync();
        }
      }
    };

    checkAuth();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (isAuthenticated === null) {
    return null; // Still checking auth status
  }

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen name="index" />
            <Stack.Screen name="setup" options={{ title: '최초 설정', headerShown: true }} />
            <Stack.Screen name="product/index" />
            <Stack.Screen name="product/[id]" options={{ title: '상품 상세', headerShown: true }} />
            <Stack.Screen name="cart" options={{ title: '장바구니', headerShown: true }} />
            <Stack.Screen name="payment" options={{ title: '결제', headerShown: true }} />
            {/* Add other authenticated screens here */}
          </Stack.Group>
        ) : (
          <Stack.Screen name="login" options={{ headerShown: false }} />
        )}
      </Stack>
    </CartProvider>
  );
}
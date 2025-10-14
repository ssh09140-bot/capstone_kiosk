import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { CartProvider } from '../context/CartContext';

// 앱이 켜지는 동안 스플래시 화면이 사라지지 않도록 설정
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 1. assets/fonts 폴더의 폰트를 불러옵니다.
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  useEffect(() => {
    // 2. 폰트 로딩이 완료되면 스플래시 화면을 숨깁니다.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 폰트가 로딩되지 않았거나 에러가 발생하면 아무것도 보여주지 않음
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="setup" options={{ title: '최초 설정', headerShown: true }} />
        <Stack.Screen name="product/index" />
        <Stack.Screen name="product/[id]" options={{ title: '상품 상세', headerShown: true }} />
        <Stack.Screen name="cart" options={{ title: '장바구니', headerShown: true }} />
        <Stack.Screen name="payment" options={{ title: '결제', headerShown: true }} />
      </Stack>
    </CartProvider>
  );
}
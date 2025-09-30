import { Stack } from 'expo-router';
import React from 'react'; // React를 import 해야만 default export가 정상적으로 작동합니다.
import { CartProvider } from '../context/CartContext';

// 'export default'가 바로 "이 파일이 이 앱의 전체 설계도입니다" 라는 문패입니다.
export default function RootLayout() {
  return (
    <CartProvider>
      <Stack>
        {/*
          screenOptions={{ headerShown: false }}
          Stack의 모든 화면에 공통적으로 적용될 옵션입니다.
          이렇게 하면 개별 Screen마다 headerShown: false를 적어줄 필요가 없어 코드가 깔끔해집니다.
        */}
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
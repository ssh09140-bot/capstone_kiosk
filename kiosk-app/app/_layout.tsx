// app/_layout.tsx

import { Stack } from 'expo-router';
import 'react-native-reanimated';
import { CartProvider } from '../context/CartContext'; // ### 바로 이 줄을 추가했습니다! ###

export default function RootLayout() {
  return (
    // CartProvider로 전체 앱을 감싸서 장바구니 데이터를 공유합니다.
    <CartProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: '최초 설정' }} />
        <Stack.Screen name="product/index" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: '상품 상세' }} />
        <Stack.Screen name="cart" options={{ title: '장바구니' }} />
        <Stack.Screen name="payment" options={{ title: '결제' }} />
      </Stack>
    </CartProvider>
  );
}
import * as React from 'react';
import { useEffect, useState } from 'react'; // Added useEffect, useState
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added AsyncStorage
import { ActivityIndicator, View } from 'react-native'; // For initial loading screen

import { CartProvider } from '../../context/CartContext'; // Import CartProvider

// Import your screens here
import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import LoginScreen from '../screens/LoginScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SetupScreen from '../screens/SetupScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import NotFoundScreen from '../screens/NotFoundScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.error("Failed to load auth token", e);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Group>
              <Stack.Screen name="Home" component={HomeScreen} /> {/* Home redirects to ProductList or Setup */}
              <Stack.Screen name="Setup" component={SetupScreen} options={{ title: '최초 설정', headerShown: true }} />
              <Stack.Screen name="ProductList" component={ProductListScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '상품 상세', headerShown: true }} />
              <Stack.Screen name="Cart" component={CartScreen} options={{ title: '장바구니', headerShown: true }} />
              <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: '결제', headerShown: true }} />
              {/* Add other authenticated screens here */}
            </Stack.Group>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          )}
          <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

export default RootNavigator;
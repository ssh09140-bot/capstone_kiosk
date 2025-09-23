// app/index.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useRouter } from 'expo-router'; // Href를 import 합니다.
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStoreId = async () => {
      const storeId = await AsyncStorage.getItem('storeId');
      
      if (storeId) {
        // ### as Href를 추가하여 타입 오류를 해결합니다. ###
        router.replace('/product' as Href);
      } else {
        // ### as Href를 추가하여 타입 오류를 해결합니다. ###
        router.replace('/setup' as Href);
      }
    };

    checkStoreId();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
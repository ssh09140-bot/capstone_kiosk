import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native'; // Replaced useRouter
import React, { useEffect, useState } from 'react'; // Added React import
import { ActivityIndicator, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation(); // Replaced useRouter
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStoreId = async () => {
      const storeId = await AsyncStorage.getItem('storeId');
      
      if (storeId) {
        navigation.replace('ProductList'); // Replaced router.replace with navigation.replace
      } else {
        navigation.replace('Setup'); // Replaced router.replace with navigation.replace
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
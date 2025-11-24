import { useRoute, useNavigation } from '@react-navigation/native'; // Replaced useRouter, useLocalSearchParams
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'; // Added Alert import
import { useCart } from '@/context/CartContext'; // Adjusted path

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute(); // Use useRoute to get params
  const { clearCart } = useCart();

  // Get totalPrice from route.params
  const { totalPrice } = route.params as { totalPrice?: string }; // Type assertion
  const finalPrice = Number(totalPrice || 0);

  const handlePaymentComplete = () => {
    Alert.alert('결제가 완료되었습니다!', '', [ // Replaced alert with Alert.alert
      {
        text: '확인',
        onPress: () => {
          clearCart();
          navigation.replace('ProductList'); // Replaced router.replace with navigation.replace
        },
      },
    ]);
  };

  useEffect(() => {
    if (finalPrice <= 0) {
      Alert.alert('결제할 금액이 없습니다. 메인화면으로 돌아갑니다.', '', [ // Replaced alert with Alert.alert
        { text: '확인', onPress: () => navigation.replace('ProductList') },
      ]);
    }
  }, [finalPrice, navigation]);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>결제하기</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>총 결제 금액</Text>
        <Text style={styles.priceText}>{finalPrice.toLocaleString()}원</Text>
      </View>

      <TouchableOpacity style={styles.completeButton} onPress={handlePaymentComplete}>
        <Text style={styles.completeButtonText}>결제 완료</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
  },
  priceContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  priceLabel: {
    fontSize: 18,
    color: '#666',
  },
  priceText: {
    fontSize: 40,
    fontWeight: 'bold',
    marginTop: 10,
  },
  completeButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
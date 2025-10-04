import React from 'react';
// ### --- 바로 이 부분이 빠져있던 코드입니다! --- ###
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '../context/CartContext';

// 안드로이드 에뮬레이터가 PC의 백엔드 서버와 통신하기 위한 전용 주소
const BACKEND_URL = 'https://capstone-kiosk.onrender.com';

export default function CartScreen() {
  const { cartItems, totalPrice, clearCart, updateQuantity } = useCart();
  const router = useRouter();

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      Alert.alert('오류', '장바구니에 상품이 없습니다.');
      return;
    }
    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        Alert.alert('오류', '가게 정보가 설정되지 않았습니다. 앱을 재시작해주세요.');
        return;
      }
      
      const simplifiedItems = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions
      }));

      const orderData = {
        storeId,
        items: simplifiedItems,
      };
      
      await axios.post(`${BACKEND_URL}/api/orders`, orderData);
      
      Alert.alert('결제 성공', '주문이 완료되었습니다.', [
        { text: '확인', onPress: () => {
            clearCart();
            router.replace('/product');
        }}
      ]);

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '주문 처리 중 오류가 발생했습니다.';
      console.error("결제 처리 실패:", error);
      Alert.alert('결제 실패', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <Text style={styles.emptyText}>장바구니가 비어 있습니다.</Text>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                {Object.values(item.selectedOptions).length > 0 && (
                  <Text style={styles.itemOptionsText}>
                    - {Object.values(item.selectedOptions).map(opt => opt.optionName).join(', ')}
                  </Text>
                )}
                <Text style={styles.itemPricePerOne}>{item.itemTotalPrice.toLocaleString()}원</Text>
              </View>
              <View style={styles.quantityControl}>
                <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemTotalPrice}>{(item.itemTotalPrice * item.quantity).toLocaleString()}원</Text>
            </View>
          )}
        />
      )}
      <View style={styles.summaryContainer}>
        <Text style={styles.totalText}>총 결제 금액</Text>
        <Text style={styles.totalPrice}>{totalPrice.toLocaleString()}원</Text>
      </View>
      <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
        <Text style={styles.paymentButtonText}>{totalPrice.toLocaleString()}원 결제하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  cartItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfo: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemOptionsText: { fontSize: 14, color: '#555', marginTop: 4 },
  itemPricePerOne: { fontSize: 14, color: '#888', marginTop: 4 },
  quantityControl: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: { width: 30, height: 30, backgroundColor: '#eee', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { fontSize: 20, fontWeight: 'bold', color: '#555' },
  quantityText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 15 },
  itemTotalPrice: { fontSize: 16, fontWeight: 'bold', minWidth: 80, textAlign: 'right', marginLeft: 10 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#888' },
  summaryContainer: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderColor: '#eee', marginTop: 10 },
  totalText: { fontSize: 18, color: '#555' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', textAlign: 'right', marginTop: 5 },
  paymentButton: { backgroundColor: '#000', padding: 15, borderRadius: 10, marginTop: 10 },
  paymentButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});
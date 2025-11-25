import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useCart } from '../context/CartContext';
import api from '../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentScreen() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { totalPrice } = useLocalSearchParams();
  const finalPrice = Number(totalPrice || 0);
  const [isProcessing, setIsProcessing] = useState(false);

  // If accessed directly without items or price, redirect
  useEffect(() => {
    if (finalPrice <= 0 || cartItems.length === 0) {
      Alert.alert('알림', '결제할 상품이 없습니다.', [
        { text: '확인', onPress: () => router.replace('/product') }
      ]);
    }
  }, []);

  const handlePaymentComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        Alert.alert('오류', '가게 정보가 없습니다. 앱을 재시작해주세요.');
        return;
      }

      // Construct payload for backend
      // Backend expects: { items: [{ productId, quantity, pricePerItem }] }
      // We calculate pricePerItem as (base price + options price) so the total matches.
      const items = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        pricePerItem: item.itemTotalPrice, // itemTotalPrice includes options
      }));

      await api.post('/orders', { items });

      Alert.alert('결제 성공', '주문이 완료되었습니다!', [
        {
          text: '확인',
          onPress: () => {
            clearCart();
            router.replace('/product');
          }
        }
      ]);

    } catch (error: any) {
      console.error("Payment failed:", error);
      const message = error.response?.data?.message || '결제 처리 중 오류가 발생했습니다.';
      Alert.alert('결제 실패', message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>결제하기</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>주문 내역 확인</Text>
          <View style={styles.row}>
            <Text style={styles.label}>주문 상품 수</Text>
            <Text style={styles.value}>{cartItems.length}개</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalPrice}>{finalPrice.toLocaleString()}원</Text>
          </View>
        </View>

        <View style={styles.paymentMethods}>
          <Text style={styles.methodTitle}>결제 수단 선택</Text>
          <View style={styles.methodGrid}>
            <TouchableOpacity style={[styles.methodButton, styles.methodButtonActive]}>
              <Text style={styles.methodTextActive}>신용카드</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.methodButton}>
              <Text style={styles.methodText}>간편결제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
          onPress={handlePaymentComplete}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>{finalPrice.toLocaleString()}원 결제하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontFamily: 'Pretendard-Bold', textAlign: 'center', marginVertical: 20, color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 16, fontFamily: 'Pretendard-Bold', marginBottom: 16, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 16, color: '#666', fontFamily: 'Pretendard-Regular' },
  value: { fontSize: 16, color: '#333', fontFamily: 'Pretendard-Bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  totalLabel: { fontSize: 18, fontFamily: 'Pretendard-Bold', color: '#333' },
  totalPrice: { fontSize: 24, fontFamily: 'Pretendard-Bold', color: '#E53935' },
  paymentMethods: { marginTop: 10 },
  methodTitle: { fontSize: 16, fontFamily: 'Pretendard-Bold', marginBottom: 12, color: '#555' },
  methodGrid: { flexDirection: 'row', gap: 10 },
  methodButton: { flex: 1, paddingVertical: 16, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  methodButtonActive: { borderColor: '#111', backgroundColor: '#111' },
  methodText: { fontSize: 16, color: '#888', fontFamily: 'Pretendard-Regular' },
  methodTextActive: { fontSize: 16, color: '#fff', fontFamily: 'Pretendard-Bold' },
  bottomBar: { padding: 20, paddingBottom: 34, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  payButton: { backgroundColor: '#111', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  payButtonDisabled: { backgroundColor: '#666' },
  payButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Pretendard-Bold' },
});
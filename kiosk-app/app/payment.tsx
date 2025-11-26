import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, SafeAreaView, ScrollView, Modal } from 'react-native';
import { useCart } from '../context/CartContext';
import api from '../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export default function PaymentScreen() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { totalPrice } = useLocalSearchParams();
  const finalPrice = Number(totalPrice || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // If accessed directly without items or price, redirect
  useEffect(() => {
    if (finalPrice <= 0 || cartItems.length === 0) {
      Alert.alert('알림', '결제할 상품이 없습니다.', [
        { text: '확인', onPress: () => router.replace('/product') }
      ]);
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (orderIdToCheck: number) => {
    // 3초마다 결제 상태 확인
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/payment/toss/status/${orderIdToCheck}`);
        if (response.data.status === 'COMPLETED') {
          // 결제 완료!
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setShowPaymentModal(false);
          setPaymentSuccess(true);
          clearCart();
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);
  };

  const handlePaymentRequest = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const storeId = (await AsyncStorage.getItem('storeId'))?.trim();
      console.log('StoreId from AsyncStorage:', storeId);

      if (!storeId) {
        Alert.alert('오류', '가게 정보가 없습니다. 앱을 재시작해주세요.');
        setIsProcessing(false);
        return;
      }

      const items = cartItems.map(item => ({
        productId: Number(item.product.id),
        quantity: item.quantity,
        pricePerItem: item.itemTotalPrice,
        selectedOptions: item.selectedOptions,
      }));

      console.log('Sending payment request:', {
        amount: finalPrice,
        orderName: '키오스크 주문',
        storeId,
        items,
      });

      const response = await api.post('/payment/toss/prepare', {
        amount: finalPrice,
        orderName: '키오스크 주문',
        storeId,
        items,
      });

      console.log('Payment response received:', response.data);

      // QR 코드용 URL 받음
      setPaymentUrl(response.data.paymentUrl);
      setOrderId(response.data.orderId);
      setShowPaymentModal(true);

      // Polling 시작
      startPolling(response.data.orderId);

    } catch (error: any) {
      console.error("Payment preparation failed:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      const details = error.response?.data?.details || '';
      const errorMsg = error.response?.data?.error || '결제 준비 중 오류가 발생했습니다.';
      const fullMessage = details ? `${errorMsg}\n\n상세: ${details}` : errorMsg;

      Alert.alert('결제 실패', fullMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/product');
  };

  const handleCancelPayment = () => {
    // Polling 중지
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setShowPaymentModal(false);
    setPaymentUrl('');
    setOrderId(null);
  };

  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={120} color="#722ed1" />
          <Text style={styles.successTitle}>결제 성공!</Text>
          <Text style={styles.successMessage}>주문이 완료되었습니다.</Text>
          <Text style={styles.successSubMessage}>맛있게 만들어 드릴게요!</Text>

          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>처음으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.title}>결제하기</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>주문 내역 확인</Text>

          {/* Detailed Order List */}
          <View style={styles.orderList}>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemHeader}>
                  <Text style={styles.orderItemName}>{item.product.name}</Text>
                  <Text style={styles.orderItemPrice}>{item.itemTotalPrice.toLocaleString()}원</Text>
                </View>
                {Object.values(item.selectedOptions).length > 0 && (
                  <Text style={styles.orderItemOptions}>
                    {Object.values(item.selectedOptions).map(opt => opt.optionName).join(', ')}
                  </Text>
                )}
                <Text style={styles.orderItemQuantity}>수량: {item.quantity}개</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>총 주문 수량</Text>
            <Text style={styles.value}>{cartItems.length}개</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalPrice}>{finalPrice.toLocaleString()}원</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="qr-code-outline" size={24} color="#722ed1" />
          <Text style={styles.infoText}>QR 코드로 간편하게 결제하세요</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={isProcessing}
          >
            <Text style={styles.backButtonText}>더 담으러 가기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            onPress={handlePaymentRequest}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>{finalPrice.toLocaleString()}원 결제</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        onRequestClose={handleCancelPayment}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>QR 코드 결제</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCancelPayment}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>휴대폰으로 QR을 스캔하세요</Text>
            <Text style={styles.qrSubtitle}>카카오페이, 토스 등으로 결제 가능</Text>

            <View style={styles.qrCodeWrapper}>
              {paymentUrl ? (
                <QRCode
                  value={paymentUrl}
                  size={280}
                  color="#000"
                  backgroundColor="#fff"
                />
              ) : (
                <ActivityIndicator size="large" color="#722ed1" />
              )}
            </View>

            <View style={styles.qrInfo}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.qrInfoText}>결제 대기 중...</Text>
            </View>

            <Text style={styles.qrAmount}>{finalPrice.toLocaleString()}원</Text>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelPayment}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontFamily: 'Pretendard-Bold', textAlign: 'center', marginVertical: 20, color: '#120338' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f9f0ff'
  },
  cardTitle: { fontSize: 18, fontFamily: 'Pretendard-Bold', marginBottom: 16, color: '#120338' },
  orderList: { marginBottom: 10 },
  orderItem: { marginBottom: 16 },
  orderItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderItemName: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: '#333' },
  orderItemPrice: { fontSize: 16, fontFamily: 'Pretendard-Bold', color: '#722ed1' },
  orderItemOptions: { fontSize: 14, color: '#888', marginBottom: 2, fontFamily: 'Pretendard-Regular' },
  orderItemQuantity: { fontSize: 14, color: '#555', fontFamily: 'Pretendard-Regular' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 16, color: '#666', fontFamily: 'Pretendard-Regular' },
  value: { fontSize: 16, color: '#120338', fontFamily: 'Pretendard-Bold' },
  divider: { height: 1, backgroundColor: '#f3e8ff', marginVertical: 16 },
  totalLabel: { fontSize: 18, fontFamily: 'Pretendard-Bold', color: '#120338' },
  totalPrice: { fontSize: 24, fontFamily: 'Pretendard-Bold', color: '#722ed1' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f0ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: { fontSize: 16, color: '#722ed1', fontFamily: 'Pretendard-Regular' },
  bottomBar: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f3e8ff',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#722ed1',
  },
  backButtonText: {
    color: '#722ed1',
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
  },
  payButton: {
    flex: 2,
    backgroundColor: '#722ed1',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: { backgroundColor: '#d3adf7' },
  payButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Pretendard-Bold' },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  successTitle: {
    fontSize: 32,
    fontFamily: 'Pretendard-Bold',
    color: '#120338',
    marginTop: 20,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 20,
    fontFamily: 'Pretendard-Regular',
    color: '#333',
    marginBottom: 5,
  },
  successSubMessage: {
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: '#888',
    marginBottom: 40,
  },
  homeButton: {
    backgroundColor: '#722ed1',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 24,
    fontFamily: 'Pretendard-Bold',
    color: '#120338',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: '#888',
    marginBottom: 40,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  qrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    gap: 8,
  },
  qrInfoText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Pretendard-Regular',
  },
  qrAmount: {
    fontSize: 32,
    fontFamily: 'Pretendard-Bold',
    color: '#722ed1',
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 40,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Pretendard-Regular',
  },
});
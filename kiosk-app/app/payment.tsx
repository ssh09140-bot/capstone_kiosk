import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, SafeAreaView, ScrollView, Modal } from 'react-native';
import { useCart } from '../context/CartContext';
import api from '../src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Toss Payments Test Client Key
const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eqa';

export default function PaymentScreen() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart();
  const { totalPrice } = useLocalSearchParams();
  const finalPrice = Number(totalPrice || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'EASY_PAY'>('CARD');

  // If accessed directly without items or price, redirect
  useEffect(() => {
    if (finalPrice <= 0 || cartItems.length === 0) {
      Alert.alert('알림', '결제할 상품이 없습니다.', [
        { text: '확인', onPress: () => router.replace('/product') }
      ]);
    }
  }, []);

  const handlePaymentRequest = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData: any) => {
    setShowPaymentModal(false);
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        Alert.alert('오류', '가게 정보가 없습니다. 앱을 재시작해주세요.');
        return;
      }

      // Construct payload for backend
      const items = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        pricePerItem: item.itemTotalPrice,
      }));

      // In a real scenario, you would send paymentKey to backend for verification here
      // const { paymentKey, orderId, amount } = paymentData;
      // await api.post('/payments/confirm', { paymentKey, orderId, amount, items });

      // For now, we just save the order as before
      await api.post('/orders', { items });

      // Show custom success modal
      setPaymentSuccess(true);

    } catch (error: any) {
      console.error("Payment failed:", error);
      const message = error.response?.data?.message || '결제 처리 중 오류가 발생했습니다.';
      Alert.alert('결제 실패', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoHome = () => {
    clearCart();
    router.replace('/product');
  };

  // HTML content for Toss Payments Widget
  const paymentHtml = `
    <!DOCTYPE html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://js.tosspayments.com/v1/payment-widget"></script>
        <style>
          body { margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; background-color: #fff; }
          #payment-method { flex: 1; }
          #agreement { padding: 20px; }
          .btn-container { padding: 20px; }
          .pay-btn {
            width: 100%;
            padding: 15px;
            background-color: #722ed1;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div id="payment-method"></div>
        <div id="agreement"></div>
        <div class="btn-container">
          <button class="pay-btn" onclick="requestPayment()">결제하기</button>
        </div>

        <script>
          const clientKey = '${TOSS_CLIENT_KEY}';
          const customerKey = 'test_customer_key'; // Random customer key for non-member
          const paymentWidget = PaymentWidget(clientKey, customerKey);
          const paymentMethodWidget = paymentWidget.renderPaymentMethods(
            '#payment-method',
            { value: ${finalPrice} },
            { variantKey: 'DEFAULT' }
          );
          
          paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

          function requestPayment() {
            const orderId = 'ORDER_' + new Date().getTime();
            paymentWidget.requestPayment({
              orderId: orderId,
              orderName: '키오스크 주문',
              successUrl: window.location.origin + '/success',
              failUrl: window.location.origin + '/fail',
            }).catch(function (error) {
              if (error.code === 'USER_CANCEL') {
                // User canceled
              } else {
                // Error
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAIL', error: error }));
              }
            });
          }
          
          // Hook into URL changes to detect success/fail redirects if they happen in-webview
          // Note: requestPayment usually redirects. We need to handle navigation state change in RN.
        </script>
      </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'FAIL') {
        Alert.alert('결제 실패', data.error.message);
        setShowPaymentModal(false);
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('/success')) {
      // Extract params from URL
      // In a real app, parse query params: paymentKey, orderId, amount
      handlePaymentComplete({});
    } else if (url.includes('/fail')) {
      setShowPaymentModal(false);
      Alert.alert('결제 실패', '결제가 취소되었거나 실패했습니다.');
    }
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

        <View style={styles.paymentMethods}>
          <Text style={styles.methodTitle}>결제 수단 선택</Text>
          <View style={styles.methodGrid}>
            <TouchableOpacity
              style={[styles.methodButton, paymentMethod === 'CARD' && styles.methodButtonActive]}
              onPress={() => setPaymentMethod('CARD')}
            >
              <Text style={[styles.methodText, paymentMethod === 'CARD' && styles.methodTextActive]}>신용카드 / 간편결제</Text>
            </TouchableOpacity>
          </View>
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

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>결제</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            style={{ flex: 1 }}
          />
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
  paymentMethods: { marginTop: 10 },
  methodTitle: { fontSize: 16, fontFamily: 'Pretendard-Bold', marginBottom: 12, color: '#555' },
  methodGrid: { flexDirection: 'row', gap: 10 },
  methodButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3e8ff'
  },
  methodButtonActive: {
    borderColor: '#722ed1',
    backgroundColor: '#722ed1',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  methodText: { fontSize: 16, color: '#888', fontFamily: 'Pretendard-Regular' },
  methodTextActive: { fontSize: 16, color: '#fff', fontFamily: 'Pretendard-Bold' },
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
    shadowOffset: { width: 0, height: 4 },
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
    color: '#722ed1',
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
  }
});
// app/payment.tsx

import { useLocalSearchParams, useRouter } from 'expo-router'; // useLocalSearchParams, useRouter import
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '../context/CartContext'; // useCart import

export default function PaymentScreen() {
  const router = useRouter();
  const { clearCart } = useCart(); // 장바구니 비우기 함수

  // URL 파라미터에서 totalPrice 값을 가져옵니다.
  const { totalPrice } = useLocalSearchParams();
  
  // totalPrice를 숫자로 변환합니다. (URL 파라미터는 항상 문자열)
  const finalPrice = Number(totalPrice || 0);

  // 결제 완료 처리를 하는 함수
  const handlePaymentComplete = () => {
    alert('결제가 완료되었습니다!');
    clearCart(); // 장바구니를 비웁니다.
    router.replace('/product'); // 메인화면으로 돌아갑니다.
  };

  // 만약 뒤로가기 등으로 결제 화면에 잘못 진입했을 때를 대비
  useEffect(() => {
    if (finalPrice <= 0) {
      alert('결제할 금액이 없습니다. 메인화면으로 돌아갑니다.');
      router.replace('/product');
    }
  }, []);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>결제하기</Text>
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>총 결제 금액</Text>
        {/* 받아온 금액을 화면에 표시합니다. */}
        <Text style={styles.priceText}>{finalPrice.toLocaleString()}원</Text>
      </View>

      {/* 실제 결제 모듈(e.g., 포트원, 토스페이먼츠)을 연동할 영역입니다. */}
      {/* 지금은 '결제 완료' 버튼으로 대체합니다. */}
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
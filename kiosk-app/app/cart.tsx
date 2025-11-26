import React from 'react';
import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, SafeAreaView, Image } from 'react-native';
import { useCart } from '../context/CartContext';
import { BACKEND_URL } from '../src/api';

export default function CartScreen() {
  const { cartItems, totalPrice, clearCart, updateQuantity } = useCart();
  const router = useRouter();

  const handlePayment = () => {
    if (cartItems.length === 0) {
      Alert.alert('오류', '장바구니에 상품이 없습니다.');
      return;
    }
    // Navigate to Payment Screen with total price
    router.push({
      pathname: '/payment',
      params: { totalPrice: totalPrice.toString() }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>장바구니</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>장바구니가 비어 있습니다.</Text>
          <TouchableOpacity style={styles.goShoppingButton} onPress={() => router.back()}>
            <Text style={styles.goShoppingButtonText}>메뉴 담으러 가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Image
                source={{ uri: item.product.imageUrl ? `${BACKEND_URL}${item.product.imageUrl}` : 'https://placehold.co/100x100/png?text=No+Image' }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                {Object.values(item.selectedOptions).length > 0 && (
                  <Text style={styles.itemOptionsText}>
                    {Object.values(item.selectedOptions).map(opt => opt.optionName).join(', ')}
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
            </View>
          )}
        />
      )}

      {cartItems.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>총 결제 금액</Text>
            <Text style={styles.totalPrice}>{totalPrice.toLocaleString()}원</Text>
          </View>
          <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
            <Text style={styles.paymentButtonText}>결제하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f3e8ff' // Light purple border
  },
  headerTitle: { fontSize: 20, fontFamily: 'Pretendard-Bold', color: '#120338' },
  closeButton: { position: 'absolute', right: 20, padding: 5 },
  closeButtonText: { fontSize: 24, color: '#722ed1' }, // Purple close button
  listContent: { padding: 20, paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#888', marginBottom: 20, fontFamily: 'Pretendard-Regular' },
  goShoppingButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: '#722ed1', // Purple button
    borderRadius: 25,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  goShoppingButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Pretendard-Bold' },
  cartItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#722ed1", // Purple shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f9f0ff'
  },
  itemImage: { width: 70, height: 70, borderRadius: 14, marginRight: 15, backgroundColor: '#f9f0ff' },
  itemInfo: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 16, fontFamily: 'Pretendard-Bold', marginBottom: 4, color: '#120338' },
  itemOptionsText: { fontSize: 13, color: '#666', marginBottom: 4 },
  itemPricePerOne: { fontSize: 14, color: '#722ed1', fontFamily: 'Pretendard-Bold' }, // Purple price
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f0ff', // Light purple bg
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#f3e8ff'
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  quantityButtonText: { fontSize: 18, fontWeight: 'bold', color: '#722ed1', lineHeight: 20 }, // Purple text
  quantityText: { fontSize: 15, fontFamily: 'Pretendard-Bold', marginHorizontal: 12, minWidth: 20, textAlign: 'center', color: '#120338' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: '#f3e8ff',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#333', fontFamily: 'Pretendard-Bold' },
  totalPrice: { fontSize: 24, color: '#722ed1', fontFamily: 'Pretendard-Bold' }, // Deep Purple total
  paymentButton: {
    backgroundColor: '#722ed1', // Purple button
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  paymentButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Pretendard-Bold' },
});
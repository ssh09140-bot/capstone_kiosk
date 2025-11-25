import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from 'react-native';
import { useCart } from '../../context/CartContext';
import type { OptionGroup, SelectedOptions } from '@kiosk/shared-types';
import { BACKEND_URL } from '../../src/api';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { product } = useLocalSearchParams();
  const parsedProduct = JSON.parse(product as string);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});

  const handleOptionSelect = (group: OptionGroup, optionId: number, optionName: string, price: number) => {
    setSelectedOptions(prev => ({ ...prev, [group.id]: { optionId, optionName, price } }));
  };

  const finalPrice = useMemo(() => {
    const optionsPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0);
    return parsedProduct.price + optionsPrice;
  }, [parsedProduct.price, selectedOptions]);

  const handleAddToCart = () => {
    addToCart(parsedProduct, 1, selectedOptions);
    Alert.alert("장바구니 추가 완료", "장바구니를 확인하시겠습니까?", [
      { text: "계속 쇼핑하기", style: "cancel", onPress: () => router.back() },
      { text: "장바구니로 이동", onPress: () => router.push('/cart') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: parsedProduct.imageUrl ? `${BACKEND_URL}${parsedProduct.imageUrl}` : 'https://placehold.co/600x400/png?text=No+Image' }}
            style={styles.productImage}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{parsedProduct.name}</Text>
          <Text style={styles.productDescription}>{parsedProduct.description}</Text>

          <View style={styles.divider} />

          {parsedProduct.optionGroups?.map((group: OptionGroup) => (
            <View key={group.id} style={styles.optionGroupContainer}>
              <Text style={styles.optionGroupName}>{group.name}</Text>
              <View style={styles.optionsContainer}>
                {group.options.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.optionButton, selectedOptions[group.id]?.optionId === option.id && styles.optionButtonSelected]}
                    onPress={() => handleOptionSelect(group, option.id, option.name, option.price)}
                  >
                    <Text style={[styles.optionText, selectedOptions[group.id]?.optionId === option.id && styles.optionTextSelected]}>{option.name}</Text>
                    {option.price > 0 && <Text style={[styles.optionPrice, selectedOptions[group.id]?.optionId === option.id && styles.optionPriceSelected]}>(+{option.price.toLocaleString()}원)</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.totalLabel}>총 주문 금액</Text>
          <Text style={styles.finalPriceText}>{finalPrice.toLocaleString()}원</Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartButtonText}>장바구니 담기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 100 },
  imageContainer: { position: 'relative' },
  productImage: { width: '100%', height: 350, resizeMode: 'cover' },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  infoContainer: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, backgroundColor: '#fff' },
  productName: { fontSize: 28, fontFamily: 'Pretendard-Bold', marginBottom: 8, color: '#111' },
  productDescription: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20, fontFamily: 'Pretendard-Regular' },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 24 },
  optionGroupContainer: { marginBottom: 24 },
  optionGroupName: { fontSize: 18, fontFamily: 'Pretendard-Bold', marginBottom: 12, color: '#333' },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  optionButtonSelected: { backgroundColor: '#111', borderColor: '#111' },
  optionText: { color: '#333', fontWeight: '600', fontSize: 15 },
  optionTextSelected: { color: '#fff' },
  optionPrice: { color: '#666', marginLeft: 6, fontSize: 14 },
  optionPriceSelected: { color: '#ccc' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  priceInfo: { flexDirection: 'column' },
  totalLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  finalPriceText: { fontSize: 24, fontFamily: 'Pretendard-Bold', color: '#111' },
  addToCartButton: { backgroundColor: '#111', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16 },
  addToCartButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Pretendard-Bold' },
});
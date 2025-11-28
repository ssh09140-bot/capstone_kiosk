import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, SafeAreaView, Modal } from 'react-native';
import { useCart } from '../../context/CartContext';
import type { OptionGroup, SelectedOptions } from '@kiosk/shared-types';
import { BACKEND_URL } from '../../src/api';
import { Ionicons } from '@expo/vector-icons';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { product } = useLocalSearchParams();
  const parsedProduct = JSON.parse(product as string);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
  const [showCartModal, setShowCartModal] = useState(false);

  const handleOptionSelect = (group: OptionGroup, optionId: number, optionName: string, price: number) => {
    setSelectedOptions(prev => ({ ...prev, [group.id]: { optionId, optionName, price } }));
  };

  const finalPrice = useMemo(() => {
    const optionsPrice = Object.values(selectedOptions).reduce((sum, opt) => sum + opt.price, 0);
    return parsedProduct.price + optionsPrice;
  }, [parsedProduct.price, selectedOptions]);

  const handleAddToCart = () => {
    addToCart(parsedProduct, 1, selectedOptions);
    setShowCartModal(true);
  };

  const handleContinueShopping = () => {
    setShowCartModal(false);
    router.back();
  };

  const handleGoToCart = () => {
    setShowCartModal(false);
    router.push('/cart');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: parsedProduct.imageUrl ? parsedProduct.imageUrl : 'https://placehold.co/600x400/png?text=No+Image' }}
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

      {/* Custom Add to Cart Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCartModal}
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="cart" size={48} color="#722ed1" />
              <View style={styles.modalCheckBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>

            <Text style={styles.modalTitle}>장바구니 추가 완료</Text>
            <Text style={styles.modalMessage}>장바구니를 확인하시겠습니까?</Text>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={handleContinueShopping}>
                <Text style={styles.modalButtonSecondaryText}>계속 쇼핑하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleGoToCart}>
                <Text style={styles.modalButtonPrimaryText}>장바구니로 이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  productName: { fontSize: 28, fontFamily: 'Pretendard-Bold', marginBottom: 8, color: '#120338' },
  productDescription: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20, fontFamily: 'Pretendard-Regular' },
  divider: { height: 1, backgroundColor: '#f3e8ff', marginBottom: 24 },
  optionGroupContainer: { marginBottom: 24 },
  optionGroupName: { fontSize: 18, fontFamily: 'Pretendard-Bold', marginBottom: 12, color: '#333' },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: {
    backgroundColor: '#f9f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3e8ff'
  },
  optionButtonSelected: {
    backgroundColor: '#722ed1',
    borderColor: '#722ed1',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: { color: '#722ed1', fontWeight: '600', fontSize: 15 },
  optionTextSelected: { color: '#fff' },
  optionPrice: { color: '#999', marginLeft: 6, fontSize: 14 },
  optionPriceSelected: { color: '#e6e6e6' },
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
    borderColor: '#f3e8ff',
    backgroundColor: '#fff',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  priceInfo: { flexDirection: 'column' },
  totalLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  finalPriceText: { fontSize: 24, fontFamily: 'Pretendard-Bold', color: '#722ed1' },
  addToCartButton: {
    backgroundColor: '#722ed1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addToCartButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Pretendard-Bold' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  modalCheckBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#52c41a',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Pretendard-Bold',
    color: '#120338',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Pretendard-Regular',
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
    color: '#666',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#722ed1',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontFamily: 'Pretendard-Bold',
    color: '#fff',
  },
});
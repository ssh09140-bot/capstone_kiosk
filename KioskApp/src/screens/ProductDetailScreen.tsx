import { useRoute, useNavigation } from '@react-navigation/native'; // Replaced useRouter, useLocalSearchParams
import React, { useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCart } from '@/context/CartContext'; // Adjusted path
import type { OptionGroup, SelectedOptions, Product } from '@kiosk/shared-types'; // Added Product type

import { API_BASE_URL } from '@env'; // Use the dotenv configured API_BASE_URL

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute(); // Use useRoute to get params
  const { addToCart } = useCart();
  
  // Cast product from route.params
  const { product: productParam } = route.params as { product: string };
  const parsedProduct: Product = JSON.parse(productParam); // Explicitly type parsedProduct

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
      { text: "계속 쇼핑하기", style: "cancel" },
      { text: "장바구니로 이동", onPress: () => navigation.push('Cart') } // Replaced router.push with navigation.push
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <Image source={{ uri: parsedProduct.imageUrl ? `${API_BASE_URL}${parsedProduct.imageUrl}` : 'https://placehold.co/600x400/png?text=No+Image' }} style={styles.productImage} /> {/* Using API_BASE_URL */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{parsedProduct.name}</Text>
          <Text style={styles.productDescription}>{parsedProduct.description}</Text>
          {parsedProduct.optionGroups?.map((group: OptionGroup) => (
            <View key={group.id} style={styles.optionGroupContainer}>
              <Text style={styles.optionGroupName}>{group.name}</Text>
              <View style={styles.optionsContainer}>
                {group.options.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[ styles.optionButton, selectedOptions[group.id]?.optionId === option.id && styles.optionButtonSelected ]}
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
        <Text style={styles.finalPriceText}>총 금액: {finalPrice.toLocaleString()}원</Text>
        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartButtonText}>장바구니 담기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  productImage: { width: '100%', height: 300, resizeMode: 'cover' },
  infoContainer: { padding: 20, paddingBottom: 100 },
  productName: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  productDescription: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 20 },
  optionGroupContainer: { marginBottom: 20 },
  optionGroupName: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { backgroundColor: '#f0f0f0', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0'},
  optionButtonSelected: { backgroundColor: '#fff', borderColor: 'black' },
  optionText: { color: '#333', fontWeight: '500' },
  optionTextSelected: { color: 'black' },
  optionPrice: { color: '#555', marginLeft: 5 },
  optionPriceSelected: { color: 'black' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, paddingBottom: 30, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  finalPriceText: { fontSize: 18, fontWeight: 'bold' },
  addToCartButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  addToCartButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
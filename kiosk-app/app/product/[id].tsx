import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Product, useCart } from '../../context/CartContext';

// ### --- 1. 에뮬레이터 전용 주소를 추가합니다. --- ###
const BACKEND_URL = 'http://10.0.2.2:3000';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { product } = useLocalSearchParams();

  const parsedProduct: Product = JSON.parse(product as string);

  const [selectedOption, setSelectedOption] = useState<string | null>(
    parsedProduct.options && parsedProduct.options.length > 0 ? parsedProduct.options[0] : null
  );

  const handleAddToCart = () => {
    addToCart(parsedProduct, selectedOption);

    Alert.alert(
      "장바구니 추가 완료",
      "장바구니를 확인하시겠습니까?",
      [
        { text: "계속 쇼핑하기", style: "cancel" },
        { text: "장바구니로 이동", onPress: () => router.push('/cart') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* ### --- 2. 목록 페이지와 똑같이 이미지 주소를 완성해줍니다. --- ### */}
        <Image
          source={{ uri: parsedProduct.imageUrl ? `${BACKEND_URL}${parsedProduct.imageUrl}` : 'https://placehold.co/600x400/png?text=No+Image' }}
          style={styles.productImage}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{parsedProduct.name}</Text>
          <Text style={styles.productPrice}>{parsedProduct.price.toLocaleString()}원</Text>
          <Text style={styles.productDescription}>{parsedProduct.description}</Text>

          {parsedProduct.options && parsedProduct.options.length > 0 && (
            <View style={styles.optionContainer}>
              <Text style={styles.optionTitle}>옵션 선택</Text>
              {parsedProduct.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedOption === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedOption(option)}>
                  <Text style={[styles.optionText, selectedOption === option && styles.optionTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
        <Text style={styles.addToCartButtonText}>장바구니 담기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  productImage: { width: '100%', height: 300, resizeMode: 'cover' },
  infoContainer: { padding: 20 },
  productName: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  productPrice: { fontSize: 20, color: '#333', marginBottom: 16 },
  productDescription: { fontSize: 16, color: '#666', lineHeight: 24 },
  optionContainer: { marginTop: 20 },
  optionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center'
  },
  optionButtonSelected: { backgroundColor: '#f0f0f0', borderColor: '#000' },
  optionText: { fontSize: 16, textAlign: 'center' },
  optionTextSelected: { fontWeight: 'bold' },
  addToCartButton: {
    backgroundColor: '#000',
    padding: 15,
    margin: 10,
    borderRadius: 10
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
});
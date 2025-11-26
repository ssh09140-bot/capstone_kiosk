import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Button,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { BACKEND_URL } from '../../src/api';
import { Product, Category } from '@kiosk/shared-types';
import { useCart } from '../../context/CartContext';

export default function ProductScreen() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeName, setStoreName] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        router.replace('/setup');
        return;
      }
      const [productRes, categoryRes, storeRes] = await Promise.all([
        api.get(`/products`),
        api.get(`/categories`),
        api.get(`/store/${storeId}`),
      ]);
      setProducts(productRes.data.map((p: any) => ({ ...p, id: p.id.toString() })));
      setCategories([{ id: null, name: '전체' }, ...categoryRes.data]);
      setStoreName(storeRes.data.storeName);
    } catch (error: any) {
      console.error("데이터 로딩 실패:", error);
      if (error.response?.status === 404) {
        // Store not found or API route issue. 
        // Likely the storeId is invalid.
        await AsyncStorage.removeItem('storeId');
        Alert.alert(
          '오류',
          '가게 정보를 찾을 수 없습니다. 설정을 초기화합니다.',
          [{ text: '확인', onPress: () => router.replace('/setup') }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== null) {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [selectedCategory, products, searchTerm]);

  const renderProductItem = ({ item }: { item: Product }) => {
    // Use availableStock if present, otherwise fallback to stock. 
    // If availableStock is undefined, it might mean the backend didn't send it or it's not calculated.
    // Default to stock if availableStock is undefined.
    const stock = item.availableStock !== undefined ? item.availableStock : (item.stock || 0);
    const isSoldOut = stock <= 0;

    return (
      <TouchableOpacity
        style={[styles.productCard, isSoldOut && styles.soldOutCard]}
        onPress={() => !isSoldOut && router.push({
          pathname: '/product/[id]',
          params: { id: item.id, product: JSON.stringify(item) }
        })}
        disabled={isSoldOut}
      >
        <Image
          source={{ uri: item.imageUrl ? `${BACKEND_URL}${item.imageUrl}` : 'https://placehold.co/600x400/png?text=No+Image' }}
          style={[styles.productImage, isSoldOut && styles.soldOutImage]}
        />
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price.toLocaleString()}원</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleStoreReset = async () => {
    Alert.alert(
      '가게 설정 초기화',
      '정말로 가게 설정을 초기화하시겠습니까? 모든 로컬 데이터가 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('storeId');
            await AsyncStorage.removeItem('userToken');
            Alert.alert('초기화 완료', '가게 설정이 초기화되었습니다. 설정 화면으로 이동합니다.');
            router.replace('/setup');
          },
        },
      ]
    );
  };

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, fontFamily: 'Pretendard-Regular' }}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeTitle}>{storeName}</Text>
        {/* Cart button removed from header */}
      </View>
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="메뉴를 검색해보세요" value={searchTerm} onChangeText={setSearchTerm} />
      </View>
      <View style={{ height: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id === null ? 'all' : cat.id}
              style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonSelected]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextSelected]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        ListEmptyComponent={<Text style={styles.emptyText}>상품이 없습니다.</Text>}
        contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 100 }} // Increased paddingBottom for footer
      />

      {/* Footer Cart Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerCartButton} onPress={() => router.push('/cart')}>
          <Text style={styles.footerCartButtonText}>장바구니</Text>
          {totalQuantity > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalQuantity}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.resetButtonContainer}>
        <Button title="가게 설정 초기화 (테스트용)" color="red" onPress={handleStoreReset} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // Centered title since button is gone
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3e8ff',
  },
  storeTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 24,
    color: '#722ed1',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f9f0ff',
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 25,
    fontFamily: 'Pretendard-Regular',
    fontSize: 15,
    color: '#120338',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  categoryContainer: { paddingHorizontal: 15, alignItems: 'center', paddingBottom: 10 },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#f9f0ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  categoryButtonSelected: {
    backgroundColor: '#722ed1',
    borderColor: '#722ed1',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  categoryText: { color: '#722ed1', fontFamily: 'Pretendard-Bold', fontSize: 14 },
  categoryTextSelected: { color: '#fff' },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 8,
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f3e8ff',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productInfo: {
    padding: 16,
    width: '100%',
  },
  productName: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    marginBottom: 8,
    height: 44,
    color: '#120338',
  },
  productPrice: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
    color: '#722ed1',
  },
  emptyText: { textAlign: 'center', marginTop: 50, fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#888' },
  soldOutCard: {
    opacity: 0.9,
  },
  soldOutImage: {
    opacity: 0.5,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(114, 46, 209, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  soldOutText: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 24,
    color: '#fff',
    transform: [{ rotate: '-15deg' }],
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  resetButtonContainer: {
    position: 'absolute',
    top: 50, // Moved to top left to avoid footer overlap, or maybe just hidden/smaller?
    // Actually let's keep it bottom left but higher z-index if needed, or just leave it. 
    // It was bottom: 20. Now footer is there. 
    // I'll move it to top left for now as it's dev only.
    left: 20,
    zIndex: 100,
    opacity: 0.5
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 34, // Safe area
    borderTopWidth: 1,
    borderColor: '#f3e8ff',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  footerCartButton: {
    backgroundColor: '#722ed1',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: "#722ed1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  footerCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  badgeText: {
    color: '#722ed1',
    fontSize: 14,
    fontFamily: 'Pretendard-Bold',
  }
});
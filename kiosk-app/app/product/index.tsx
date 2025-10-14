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
import axios from 'axios';
import { Product } from '../../context/CartContext';

// Render 서버의 고정 주소 또는 ngrok 주소를 사용해야 합니다.
const BACKEND_URL = 'https://capstone-kiosk.onrender.com';

interface Category {
    id: number | null;
    name: string;
}

interface ProductWithCategory extends Product {
    categoryId: number | null;
    stock: number;
}

export default function ProductScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
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
          axios.get(`${BACKEND_URL}/api/products/${storeId}`),
          axios.get(`${BACKEND_URL}/api/categories/${storeId}`),
          axios.get(`${BACKEND_URL}/api/store/${storeId}`),
      ]);
      setProducts(productRes.data.map((p: any) => ({ ...p, id: p.id.toString() })));
      setCategories([{ id: null, name: '전체' }, ...categoryRes.data]);
      setStoreName(storeRes.data.storeName);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      Alert.alert('오류', '데이터를 불러오는 데 실패했습니다.');
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

  const renderProductItem = ({ item }: { item: ProductWithCategory }) => {
    const isSoldOut = item.stock <= 0;
    return (
      <TouchableOpacity
        style={[styles.productCard, isSoldOut && styles.soldOutCard]}
        onPress={() => !isSoldOut && router.push({
          // ### --- 1. 타입 오류가 발생하지 않는 안전한 객체 형태로 수정했습니다. --- ###
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
  
  const handleStoreReset = () => { /* 이전과 동일 */ };
  
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
        <TouchableOpacity onPress={() => router.push('/cart')}>
          <Text style={styles.cartButton}>🛒</Text>
        </TouchableOpacity>
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
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListEmptyComponent={<Text style={styles.emptyText}>상품이 없습니다.</Text>}
        contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 80 }}
      />
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 5,
    },
    storeTitle: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 24,
    },
    cartButton: {
        fontSize: 24,
    },
    searchContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    searchInput: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 20,
        height: 44,
        borderRadius: 22,
        fontFamily: 'Pretendard-Regular',
        fontSize: 15,
    },
    categoryContainer: { paddingHorizontal: 15, alignItems: 'center' },
    categoryButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginRight: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
    },
    categoryButtonSelected: { backgroundColor: '#000000' },
    categoryText: { color: '#333', fontFamily: 'Pretendard-Bold', fontSize: 14 },
    categoryTextSelected: { color: '#fff' },
    productCard: { 
        flex: 1, 
        backgroundColor: '#fff', 
        borderRadius: 12, 
        margin: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1, },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    productImage: { 
        width: '100%', 
        height: 150, 
        borderTopLeftRadius: 12, 
        borderTopRightRadius: 12,
    },
    productInfo: {
        padding: 12,
        width: '100%',
    },
    productName: { 
        fontFamily: 'Pretendard-Bold', 
        fontSize: 16,
        marginBottom: 4,
        height: 40,
    },
    productPrice: { 
        fontFamily: 'Pretendard-Regular', 
        fontSize: 14, 
        color: '#555' 
    },
    emptyText: { textAlign: 'center', marginTop: 50, fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#888' },
    // ### --- 2. 빠져있던 스타일들을 모두 추가했습니다. --- ###
    soldOutCard: {
        // 특별한 스타일 없이 오버레이로 처리
    },
    soldOutImage: {
        opacity: 0.5, // 이미지를 약간 어둡게
    },
    soldOutOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150, // 이미지 높이와 동일하게
        backgroundColor: 'rgba(255, 255, 255, 0.5)', // 반투명 흰색 오버레이
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 12, 
        borderTopRightRadius: 12,
    },
    soldOutText: {
        fontFamily: 'Pretendard-Bold',
        fontSize: 24,
        color: '#333',
        transform: [{ rotate: '-15deg' }] // 약간 기울여서 표시
    },
    resetButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    }
});
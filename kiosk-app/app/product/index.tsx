import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Product } from '../../context/CartContext';

// 안드로이드 에뮬레이터가 PC의 백엔드 서버와 통신하기 위한 전용 주소
const BACKEND_URL = 'https://capstone-kiosk.onrender.com';

// 카테고리 데이터의 타입을 정의합니다.
interface Category {
    id: number | null; // '전체' 카테고리를 위해 null 허용
    name: string;
}

// Product 인터페이스를 확장하여 categoryId를 포함시킵니다.
interface ProductWithCategory extends Product {
    categoryId: number | null;
}

export default function ProductScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null); // '전체'가 기본값
  const [isLoading, setIsLoading] = useState(true);

  // 서버로부터 상품과 카테고리 데이터를 모두 불러오는 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        router.replace('/setup');
        return;
      }

      // API 동시 요청으로 로딩 속도를 개선합니다.
      const [productRes, categoryRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/products/${storeId}`),
          axios.get(`${BACKEND_URL}/api/categories/${storeId}`)
      ]);
      
      const formattedProducts = productRes.data.map((p: any) => ({ ...p, id: p.id.toString() }));
      setProducts(formattedProducts);
      
      // '전체' 버튼을 맨 앞에 추가해줍니다.
      setCategories([{ id: null, name: '전체' }, ...categoryRes.data]);

    } catch (error) {
      console.error("데이터 로딩 실패:", error);
      Alert.alert('오류', '데이터를 불러오는 데 실패했습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 선택된 카테고리에 따라 보여줄 상품 목록을 필터링합니다.
  const filteredProducts = useMemo(() => {
    // '전체' 카테고리가 선택된 경우, 모든 상품을 보여줍니다.
    if (selectedCategory === null) {
        return products;
    }
    // 특정 카테고리가 선택된 경우, 해당 categoryId를 가진 상품만 필터링합니다.
    return products.filter((p: ProductWithCategory) => p.categoryId === selectedCategory);
  }, [selectedCategory, products]);

  // 각 상품 항목을 화면에 그리는 함수
  const renderProductItem = ({ item }: { item: ProductWithCategory }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/product/[id]',
        params: { id: item.id, product: JSON.stringify(item) }
      })}
    >
      <Image 
        source={{ uri: item.imageUrl ? `${BACKEND_URL}${item.imageUrl}` : 'https://placehold.co/600x400/png?text=No+Image' }} 
        style={styles.productImage} 
      />
      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price.toLocaleString()}원</Text>
    </TouchableOpacity>
  );

  // 데이터 로딩 중일 때 보여줄 화면
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- 카테고리 버튼 UI --- */}
      <View style={{ height: 50 }}>
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
        ListEmptyComponent={<Text style={styles.emptyText}>해당 카테고리에 상품이 없습니다.</Text>}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 10 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    categoryContainer: { paddingHorizontal: 10, alignItems: 'center' },
    categoryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginRight: 10,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    categoryButtonSelected: { backgroundColor: '#000', borderColor: '#000' },
    categoryText: { color: '#333', fontWeight: 'bold' },
    categoryTextSelected: { color: '#fff', fontWeight: 'bold' },
    listContainer: { justifyContent: 'space-between' },
    productCard: { 
        flex: 1, 
        backgroundColor: '#fff', 
        borderRadius: 10, 
        padding: 10, 
        margin: 5, 
        alignItems: 'center',
        maxWidth: '48%', // 2열 레이아웃을 위한 너비 조절
    },
    productImage: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
    productName: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    productPrice: { fontSize: 14, color: '#888' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
});
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
  TextInput, // 검색창을 위해 TextInput을 import 합니다.
  Button
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Product } from '../../context/CartContext';

// Render 서버의 고정 주소 또는 ngrok 주소를 사용해야 합니다.
const BACKEND_URL = 'https://capstone-kiosk.onrender.com';

// 카테고리 데이터의 타입을 정의합니다.
interface Category {
    id: number | null;
    name: string;
}

// Product 인터페이스를 확장하여 categoryId와 stock을 포함시킵니다.
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
  const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태

  // 서버로부터 상품과 카테고리 데이터를 모두 불러오는 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeId = await AsyncStorage.getItem('storeId');
      if (!storeId) {
        router.replace('/setup');
        return;
      }

      const [productRes, categoryRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/products/${storeId}`),
          axios.get(`${BACKEND_URL}/api/categories/${storeId}`)
      ]);
      
      const formattedProducts = productRes.data.map((p: any) => ({ ...p, id: p.id.toString() }));
      setProducts(formattedProducts);
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

  // 카테고리와 검색어에 따라 보여줄 상품 목록을 필터링합니다.
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (selectedCategory !== null) {
        filtered = filtered.filter((p: ProductWithCategory) => p.categoryId === selectedCategory);
    }

    if (searchTerm.trim() !== '') {
        filtered = filtered.filter((p: ProductWithCategory) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return filtered;
  }, [selectedCategory, products, searchTerm]);

  // 각 상품 항목을 화면에 그리는 함수
  const renderProductItem = ({ item }: { item: ProductWithCategory }) => {
    const isSoldOut = item.stock <= 0;

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
                <Text style={styles.soldOutText}>품절</Text>
            </View>
        )}
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString()}원</Text>
      </TouchableOpacity>
    );
  };

  // '가게 설정 초기화' 버튼을 눌렀을 때 실행되는 함수
  const handleStoreReset = () => {
    Alert.alert(
      "가게 설정 초기화",
      "정말로 가게 ID 설정을 지우고 초기 설정 화면으로 돌아가시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { text: "확인", onPress: async () => {
            await AsyncStorage.removeItem('storeId');
            router.replace('/setup');
        }}
      ]
    );
  };

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

      {/* --- 검색창 UI --- */}
      <View style={styles.searchContainer}>
        <TextInput
            style={styles.searchInput}
            placeholder="상품 이름을 검색하세요"
            value={searchTerm}
            onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListEmptyComponent={<Text style={styles.emptyText}>상품이 없습니다.</Text>}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
      />

      {/* --- '가게 초기화' 버튼 UI --- */}
      <View style={styles.resetButtonContainer}>
        <Button title="가게 설정 초기화 (테스트용)" color="red" onPress={handleStoreReset} />
      </View>
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
    searchContainer: {
        paddingHorizontal: 10,
        marginVertical: 10,
    },
    searchInput: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    productCard: { 
        flex: 1, 
        backgroundColor: '#fff', 
        borderRadius: 10, 
        padding: 10, 
        margin: 5, 
        alignItems: 'center',
        maxWidth: '48%',
    },
    productImage: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
    productName: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    productPrice: { fontSize: 14, color: '#888' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
    soldOutCard: {
        backgroundColor: '#f9f9f9',
    },
    soldOutImage: {
        opacity: 0.3,
    },
    soldOutOverlay: {
        position: 'absolute',
        top: 10,
        left: 5,
        right: 5,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    soldOutText: {
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        fontWeight: 'bold',
        fontSize: 16,
        overflow: 'hidden' // borderRadius를 적용하기 위해 추가
    },
    resetButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    }
});
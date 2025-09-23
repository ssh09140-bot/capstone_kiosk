// app/setup.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

// 이 주소는 사장님의 PC IP 주소여야 합니다!
const BACKEND_URL = 'http://10.0.2.2:3000'; // 예시: 'http://192.168.0.5:3000'

export default function SetupScreen() {
  const [storeId, setStoreId] = useState('');
  const router = useRouter();

  const handleSave = async () => {
    if (!storeId.trim()) {
      Alert.alert('오류', '가게 ID를 입력해주세요.');
      return;
    }
    try {
      const response = await axios.get(`${BACKEND_URL}/api/store/${storeId}`);
      
      await AsyncStorage.setItem('storeId', storeId);

      // ### --- 이 부분이 수정되었습니다 --- ###
      // 알림창의 '확인' 버튼을 누르면, 그 다음에 화면을 이동시킵니다.
      Alert.alert(
        '설정 완료', 
        `${response.data.storeName}으로 설정되었습니다.`,
        [{ text: '확인', onPress: () => router.replace('/product') }]
      );

    } catch (error) {
      console.error(error);
      Alert.alert('오류', '유효하지 않은 가게 ID이거나 서버에 연결할 수 없습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>키오스크 설정</Text>
      <Text style={styles.label}>관리자 페이지에서 발급받은 가게 ID를 입력해주세요.</Text>
      <TextInput
        style={styles.input}
        placeholder="Store ID"
        value={storeId}
        onChangeText={setStoreId}
        autoCapitalize="none"
      />
      <Button title="저장하고 시작하기" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, textAlign: 'center', marginBottom: 10, color: '#666' },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
});
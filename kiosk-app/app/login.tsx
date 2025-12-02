import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/firebaseConfig';
import api from '../src/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // 1. Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get ID Token
      const idToken = await user.getIdToken();

      // 3. Send ID Token to Backend
      const response = await api.post('/auth/login', { idToken });
      const { token, user: userData } = response.data;

      await AsyncStorage.setItem('userToken', token);

      // storeId가 있으면 저장, 없으면 저장하지 않음
      if (userData?.storeId) {
        await AsyncStorage.setItem('storeId', userData.storeId.toString());
      } else {
        // storeId가 없으면 키 자체를 삭제
        await AsyncStorage.removeItem('storeId');
      }

      Alert.alert('로그인 성공', '환영합니다!');
      router.replace('/');
    } catch (error: any) {
      console.error('로그인 실패:', error);
      let errorMessage = '이메일 또는 비밀번호를 확인해주세요.';

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? '로그인 중...' : '로그인'} onPress={handleLogin} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
});

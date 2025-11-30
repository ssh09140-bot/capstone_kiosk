import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../api';
import './Auth.css';

const { Title } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 이미 로그인한 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 1. Firebase 로그인
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. 이메일 인증 확인
      if (!user.emailVerified) {
        message.warning('이메일 인증이 필요합니다. 이메일을 확인해주세요.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Firebase ID 토큰 가져오기
      const idToken = await user.getIdToken();

      // 4. 백엔드에 로그인 요청
      const response = await api.post('/auth/login', { idToken });
      const { token, user: userData } = response.data;

      // 5. 토큰 및 사용자 정보 저장
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));

      message.success('로그인 성공!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('로그인 에러:', error);
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <Title level={2} className="auth-title">OPTIMA | ORDER</Title>
          <p className="auth-subtitle">최적의 재고관리 시스템에 오신 것을 환영합니다</p>
        </div>

        <Form form={form} name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[{ required: true, message: '이메일을 입력해주세요!', type: 'email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="이메일" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="auth-button" loading={loading}>
              로그인
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button type="link" onClick={() => navigate('/register')} className="auth-link-button">
              계정이 없으신가요? <span style={{ fontWeight: 'bold' }}>회원가입</span>
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button type="link" onClick={() => navigate('/reset-password')} className="auth-link-button">
              비밀번호를 잊으셨나요?
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
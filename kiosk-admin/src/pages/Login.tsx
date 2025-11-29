import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

const { Title } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Firebase 로그인
      await signInWithEmailAndPassword(auth, values.username, values.password);

      message.success('로그인 성공!');
      navigate('/');
    } catch (error: any) {
      console.error('로그인 에러:', error);
      let errorMessage = '로그인에 실패했습니다.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = '이메일 또는 비밀번호가 일치하지 않습니다.';
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
          <p className="auth-subtitle">옵티마 오더에 오신 관리자님을 환영합니다.</p>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: '아이디(이메일)를 입력해주세요!' }]}>
            <Input prefix={<UserOutlined />} placeholder="아이디 (이메일)" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="auth-button" loading={loading}>
              로그인
            </Button>
          </Form.Item>
          <Form.Item style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Button type="link" onClick={() => navigate('/reset-password')} className="auth-link-button">
              비밀번호를 잊으셨나요?
            </Button>
          </Form.Item>
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button type="link" onClick={() => navigate('/register')} className="auth-link-button">
              아직 계정이 없으신가요? <span style={{ fontWeight: 'bold' }}>회원가입</span>
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
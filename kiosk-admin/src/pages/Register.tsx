import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { MailOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../api';
import './Auth.css';

const { Title } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 1. Firebase에 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. 백엔드에 사용자 정보 저장
      await api.post('/auth/register', {
        email: values.email,
        storeName: values.storeName,
        firebaseUid: user.uid,
      });

      // 3. 인증 이메일 발송
      await sendEmailVerification(user);

      message.success('회원가입 성공! 인증 메일을 확인해주세요.');
      message.info('이메일 인증 후 로그인할 수 있습니다.');
      navigate('/login');
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      let errorMessage = '회원가입 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호는 6자리 이상이어야 합니다.';
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
          <p className="auth-subtitle">지금 바로 최적의 재고관리를 시작해보세요</p>
        </div>

        <Form form={form} name="register" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[{ required: true, message: '이메일을 입력해주세요!', type: 'email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="이메일 (로그인 ID)" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '비밀번호를 한번 더 입력해주세요!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호 확인" />
          </Form.Item>

          <Form.Item name="storeName" rules={[{ required: true, message: '가게 이름을 입력해주세요!' }]}>
            <Input prefix={<ShopOutlined />} placeholder="가게 이름" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="auth-button" loading={loading}>
              회원가입
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Button type="link" onClick={() => navigate('/login')} className="auth-link-button">
              이미 계정이 있으신가요? <span style={{ fontWeight: 'bold' }}>로그인</span>
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Register;

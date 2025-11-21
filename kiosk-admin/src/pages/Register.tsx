import React from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { MailOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './Auth.css';

const { Title } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      console.log("회원가입 시도:", values); // 1. 함수가 시작되었는지 확인

      const response = await api.post('/auth/register', {
        email: values.email,
        password: values.password,
        storeName: values.storeName,
      });

      console.log('서버 응답:', response.data); // 2. 서버 응답이 왔는지 확인
      message.success('회원가입 성공! 로그인 페이지로 이동합니다.');
      navigate('/login');

    } catch (error: any) {
      console.error("회원가입 실패:", error); // 3. 오류가 발생했는지, 어떤 오류인지 확인

      const errorMessage = error.response?.data?.message || '회원가입 중 알 수 없는 오류가 발생했습니다.';
      message.error(errorMessage);
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

        <Form name="register" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: '이메일을 입력해주세요!', type: 'email' }]}>
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
            <Button type="primary" htmlType="submit" className="auth-button">
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
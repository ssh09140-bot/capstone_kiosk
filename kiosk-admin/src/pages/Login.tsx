import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
        const response = await api.post('/auth/login', {
            email: values.username,
            password: values.password
        });
        localStorage.setItem('authToken', response.data.token);
        message.success('로그인 성공!');
        navigate('/');
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
        message.error(errorMessage);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>키오스크 관리자 로그인</Title>
        <Form name="login" onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '아이디(이메일)를 입력해주세요!' }]}>
            <Input prefix={<UserOutlined />} placeholder="아이디 (이메일)" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              로그인
            </Button>
          </Form.Item>
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
             <Button type="link" onClick={() => navigate('/register')}>
                아직 계정이 없으신가요? 회원가입
             </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
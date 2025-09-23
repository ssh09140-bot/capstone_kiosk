// src/pages/Register.tsx

import React from 'react';
import { Form, Input, Button, Card, Typography } from 'antd';
import { MailOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // axios import

const { Title } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();

  // ### onFinish 함수를 아래와 같이 완전히 교체합니다. ###
  const onFinish = async (values: any) => {
    try {
      // 백엔드 API 서버의 회원가입 주소로 POST 요청을 보냅니다.
      const response = await axios.post('http://localhost:3000/api/auth/register', {
        email: values.email,
        password: values.password,
        storeName: values.storeName,
      });

      console.log('서버 응답:', response.data);
      alert('회원가입 성공! 로그인 페이지로 이동합니다.');
      navigate('/login');

    } catch (error: any) {
      console.error('회원가입 실패:', error);
      // 서버에서 보낸 에러 메시지를 사용자에게 보여줍니다.
      const errorMessage = error.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
      alert(errorMessage);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>관리자 회원가입</Title>
        <Form name="register" onFinish={onFinish}>
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
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              회원가입
            </Button>
          </Form.Item>
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
             <Button type="link" onClick={() => navigate('/login')}>
                이미 계정이 있으신가요? 로그인
             </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
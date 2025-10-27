import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Spin, Typography, message, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title } = Typography;

interface UserInfo {
  email: string;
  storeName: string;
  storeId: string;
}

const MyInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/me');
        setUserInfo(response.data);
      } catch (error) {
        console.error("사용자 정보를 불러오지 못했습니다.", error);
        message.error("사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.");
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
  }

  return (
    <Card style={{ maxWidth: '600px', margin: 'auto' }}>
      <Title level={3}>내 정보</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="이메일 (ID)">{userInfo?.email}</Descriptions.Item>
        <Descriptions.Item label="가게 이름">{userInfo?.storeName}</Descriptions.Item>
        <Descriptions.Item label="고유 가게 ID (키오스크 연동용)">{userInfo?.storeId}</Descriptions.Item>
      </Descriptions>
      <Button
        type="primary"
        danger
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        style={{ marginTop: '24px', width: '100%' }}
        className="mobile-only-logout-button"
      >
        로그아웃
      </Button>
    </Card>
  );
};

export default MyInfo;
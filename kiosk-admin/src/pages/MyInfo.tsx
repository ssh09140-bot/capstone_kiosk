import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Spin, Typography, message, Button, Divider } from 'antd';
import { LogoutOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title, Text } = Typography;

// Toss Payments Client Key - This should be in your .env file or similar
const TOSS_CLIENT_KEY = 'test_ck_vZnjEJeQVxy9L4zOKeDOrPmOoBN0'; // 실제 클라이언트 키로 교체하세요.

interface UserInfo {
  email: string;
  storeName: string;
  storeId: string;
  card: {
    company: string;
    number: string;
  } | null;
}

const MyInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleRegisterCard = async () => {
    if (!userInfo) return;

    const tossPayments = (window as any).TossPayments(TOSS_CLIENT_KEY);
    tossPayments.requestBillingAuth('카드', {
      customerKey: userInfo.storeId, // 사용자의 storeId를 customerKey로 사용
      successUrl: `${window.location.origin}/my-info`,
      failUrl: `${window.location.origin}/my-info`,
    }).then(async (result: any) => {
        // 인증 성공
        try {
            const response = await api.post('/billing/issue-billing-key', {
                authKey: result.billingAuthKey,
                customerKey: result.customerKey,
            });
            message.success('카드가 성공적으로 등록되었습니다.');
            // 유저 정보를 다시 불러와서 카드 정보를 업데이트
            fetchUserInfo();
        } catch (error) {
            console.error('빌링키 발급 실패', error);
            message.error('카드 등록에 실패했습니다. 다시 시도해주세요.');
        }
    }).catch((err: any) => {
        // 인증 실패
        console.error(err);
        message.error(err.message || '카드 인증에 실패했습니다.');
    });
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

      <Divider />

      <Title level={4}>결제 정보</Title>
      {userInfo?.card ? (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="등록된 카드">{`${userInfo.card.company} **** **** **** ${userInfo.card.number.slice(-4)}`}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Text>등록된 카드가 없습니다.</Text>
      )}
      <Button
        icon={<CreditCardOutlined />}
        onClick={handleRegisterCard}
        style={{ marginTop: '16px', width: '100%' }}
      >
        {userInfo?.card ? '카드 변경' : '카드 등록'}
      </Button>

      <Divider style={{ marginTop: 40 }}/>

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
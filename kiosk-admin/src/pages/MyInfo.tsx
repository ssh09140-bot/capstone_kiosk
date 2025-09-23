import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Spin, Typography, message } from 'antd';
import api from '../api'; // axios 대신 api를 import

const { Title } = Typography;

// 사용자 정보의 타입을 정의합니다.
interface UserInfo {
  email: string;
  storeName: string;
  storeId: string;
}

const MyInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // 1. 브라우저 저장소(localStorage)에서 로그인 토큰을 꺼냅니다.
        const token = localStorage.getItem('authToken');

        // 2. 만약 토큰이 없다면, 로그인이 필요하다고 알리고 함수를 종료합니다.
        if (!token) {
            message.error("로그인이 필요합니다. 로그인 페이지로 이동해주세요.");
            setLoading(false);
            return;
        }

        // 3. 서버에 '내 정보'를 요청할 때, 'Authorization' 헤더에 토큰을 담아 보냅니다.
        const response = await api.get('http://localhost:3000/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setUserInfo(response.data);

      } catch (error) {
        console.error("사용자 정보를 불러오지 못했습니다.", error);
        message.error("사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []); // []가 비어있으므로, 페이지가 처음 열릴 때 한 번만 실행됩니다.

  // 데이터 로딩 중일 때 로딩 아이콘을 보여줍니다.
  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
  }

  return (
    <Card>
      <Title level={3}>내 정보</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="이메일 (ID)">{userInfo?.email}</Descriptions.Item>
        <Descriptions.Item label="가게 이름">{userInfo?.storeName}</Descriptions.Item>
        <Descriptions.Item label="고유 가게 ID (키오스크 연동용)">{userInfo?.storeId}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default MyInfo;
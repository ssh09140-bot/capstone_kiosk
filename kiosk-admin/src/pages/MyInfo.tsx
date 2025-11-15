import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Card, Descriptions, Spin, Typography, message, Button, Divider, Input, Image } from 'antd';
import { LogoutOutlined, CreditCardOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Title, Text } = Typography;

// Toss Payments Client Key - This should be in your .env file or similar
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY;

interface UserInfo {
  email: string;
  storeName: string;
  storeId: string;
  card: {
    company: string;
    number: string;
  } | null;
  businessRegistrationNumber?: string;
  businessLicenseImageUrl?: string;
}

const MyInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Business Info State
  const [businessNumber, setBusinessNumber] = useState('');
  const [licenseImageFile, setLicenseImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<UserInfo>('/me');
      setUserInfo(response.data);
      setBusinessNumber(response.data.businessRegistrationNumber || '');
      setPreviewImageUrl(response.data.businessLicenseImageUrl || null);
    } catch (error) {
      console.error("사용자 정보를 불러오지 못했습니다.", error);
      message.error("사용자 정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const billingAuthKey = urlParams.get('authKey');
    const customerKey = urlParams.get('customerKey');

    const registerCardAndFetch = async () => {
      setLoading(true);
      try {
        const response = await api.post<UserInfo>('/billing/issue-billing-key', { 
          authKey: billingAuthKey, 
          customerKey 
        });
        message.success('카드가 성공적으로 등록되었습니다.');
        setUserInfo(response.data);
        navigate('/my-info', { replace: true });
        setTimeout(() => {
          fetchUserInfo();
        }, 1000);
      } catch (error) {
        console.error('빌링키 발급 실패', error);
        message.error('카드 등록에 실패했습니다. 다시 시도해주세요.');
        navigate('/my-info', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (billingAuthKey && customerKey) {
      registerCardAndFetch();
    } else {
      fetchUserInfo();
    }
  }, [fetchUserInfo, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const handleRegisterCard = () => {
    if (!userInfo) return;
    const tossPayments = (window as any).TossPayments(TOSS_CLIENT_KEY);
    tossPayments.requestBillingAuth('카드', {
      customerKey: userInfo.storeId,
      successUrl: `${window.location.origin}/my-info`,
      failUrl: `${window.location.origin}/my-info`,
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLicenseImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    }
  };

  const handleBusinessInfoSave = async () => {
    if (!businessNumber) {
      message.error('사업자 등록번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('businessRegistrationNumber', businessNumber);
      if (licenseImageFile) {
        formData.append('businessLicenseImage', licenseImageFile);
      } else if (previewImageUrl) {
        // If there's a preview but no new file, it means we keep the existing image.
        // The backend should handle the case where the image URL is passed but no file is uploaded.
        formData.append('businessLicenseImageUrl', previewImageUrl);
      }

      const response = await api.put('/me/business-info', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUserInfo(prev => prev ? { ...prev, ...response.data } : response.data);
      message.success('사업자 정보가 성공적으로 저장되었습니다.');
      fetchUserInfo(); // Re-fetch to get the latest state
    } catch (error: any) {
      console.error('사업자 정보 저장 실패', error);
      const errorMessage = error.response?.data?.message || '사업자 정보 저장에 실패했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
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

      <Title level={4}>사업자 정보</Title>
      <Descriptions bordered column={1}>
        <Descriptions.Item label="사업자 등록번호">
          <Input 
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
            placeholder="'-' 없이 숫자만 입력"
          />
        </Descriptions.Item>
        <Descriptions.Item label="사업자 등록증 이미지">
          {previewImageUrl && <Image width={200} src={previewImageUrl} style={{ marginBottom: 16 }} />}
          <Input type="file" accept="image/*" onChange={handleImageChange} />
        </Descriptions.Item>
      </Descriptions>
      <Button
        icon={<SaveOutlined />}
        onClick={handleBusinessInfoSave}
        style={{ marginTop: '16px', width: '100%' }}
        type="primary"
      >
        사업자 정보 저장
      </Button>

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
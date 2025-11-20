import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Card, Descriptions, Spin, Typography, message, Button, Divider, Input, Image } from 'antd';
import { LogoutOutlined, CreditCardOutlined, SaveOutlined, UserOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './MyInfo.css';

const { Title, Text } = Typography;

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
  storeAddress?: string;
}

const MyInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showStoreId, setShowStoreId] = useState(false);

  const [businessNumber, setBusinessNumber] = useState('');
  const [licenseImageFile, setLicenseImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [storeAddress, setStoreAddress] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<UserInfo>('/me');
      setUserInfo(response.data);
      setBusinessNumber(response.data.businessRegistrationNumber || '');
      setPreviewImageUrl(response.data.businessLicenseImageUrl || null);
      setStoreAddress(response.data.storeAddress || '');
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
    if (!storeAddress) {
      message.error('매장 주소를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('businessRegistrationNumber', businessNumber);
      formData.append('storeAddress', storeAddress);
      if (licenseImageFile) {
        formData.append('businessLicenseImage', licenseImageFile);
      } else if (previewImageUrl) {
        formData.append('businessLicenseImageUrl', previewImageUrl);
      }

      const response = await api.put('/me/business-info', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUserInfo(prev => prev ? { ...prev, ...response.data } : response.data);
      message.success('사업자 정보가 성공적으로 저장되었습니다.');
      fetchUserInfo();
    } catch (error: any) {
      console.error('사업자 정보 저장 실패', error);
      const errorMessage = error.response?.data?.message || '사업자 정보 저장에 실패했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>정보를 불러오는 중...</Text>
      </div>
    );
  }

  return (
    <div className="myinfo-container">
      <Card className="myinfo-card">
        <div className="profile-header">
          <div className="profile-icon">
            <UserOutlined />
          </div>
          <Title level={3} style={{ margin: '12px 0 0 0' }}>내 정보</Title>
        </div>

        <Divider />

        <div className="info-section">
          <Title level={4} className="section-title">기본 정보</Title>
          <Descriptions bordered column={1} size={isMobile ? 'small' : 'default'}>
            <Descriptions.Item label="이메일 (ID)">{userInfo?.email}</Descriptions.Item>
            <Descriptions.Item label="가게 이름">{userInfo?.storeName}</Descriptions.Item>
            <Descriptions.Item label="고유 가게 ID">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 14 }}>
                  {showStoreId ? userInfo?.storeId : '••••••••••••••••'}
                </span>
                <Button
                  size="small"
                  icon={showStoreId ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowStoreId(!showStoreId)}
                >
                  {showStoreId ? '숨기기' : '표시'}
                </Button>
              </div>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider />

        <div className="info-section">
          <Title level={4} className="section-title">사업자 정보</Title>
          <Descriptions bordered column={1} size={isMobile ? 'small' : 'default'}>
            <Descriptions.Item label="사업자 등록번호">
              <Input
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                placeholder="'-' 없이 숫자만 입력"
              />
            </Descriptions.Item>
            <Descriptions.Item label="매장 주소">
              <Input
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="매장 주소를 입력해주세요"
              />
            </Descriptions.Item>
            <Descriptions.Item label="사업자 등록증">
              {previewImageUrl && <Image width={isMobile ? '100%' : 200} src={previewImageUrl} style={{ marginBottom: 16 }} />}
              <Input type="file" accept="image/*" onChange={handleImageChange} />
            </Descriptions.Item>
          </Descriptions>
          <Button
            icon={<SaveOutlined />}
            onClick={handleBusinessInfoSave}
            className="action-button"
            type="primary"
          >
            사업자 정보 저장
          </Button>
        </div>

        <Divider />

        <div className="info-section">
          <Title level={4} className="section-title">결제 정보</Title>
          {userInfo?.card ? (
            <Descriptions bordered column={1} size={isMobile ? 'small' : 'default'}>
              <Descriptions.Item label="등록된 카드">{`${userInfo.card.company} **** **** **** ${userInfo.card.number.slice(-4)}`}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Card className="no-card-notice">
              <Text type="secondary">등록된 카드가 없습니다.</Text>
            </Card>
          )}
          <Button
            icon={<CreditCardOutlined />}
            onClick={handleRegisterCard}
            className="action-button"
          >
            {userInfo?.card ? '카드 변경' : '카드 등록'}
          </Button>
        </div>

        <Divider />

        <Button
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="logout-button"
        >
          로그아웃
        </Button>
      </Card>
    </div>
  );
};

export default MyInfo;
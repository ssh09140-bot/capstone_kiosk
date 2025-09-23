import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { 
    DashboardOutlined, 
    UnorderedListOutlined, 
    PlusCircleOutlined,
    UserOutlined,
    LogoutOutlined,
    AppstoreOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '대시보드', onClick: () => navigate('/') },
    { key: '/products', icon: <UnorderedListOutlined />, label: '상품 목록', onClick: () => navigate('/products') },
    { key: '/products/new', icon: <PlusCircleOutlined />, label: '새 상품 등록', onClick: () => navigate('/products/new') },
    {
      key: '/categories',
      icon: <AppstoreOutlined />,
      label: '카테고리 관리',
      onClick: () => navigate('/categories'),
    },
    {
      key: '/orders',
      icon: <UnorderedListOutlined />, // 상품 목록과 같은 아이콘 사용
      label: '주문 내역',
      onClick: () => navigate('/orders'),
    },
    { key: '/my-info', icon: <UserOutlined />, label: '내 정보', onClick: () => navigate('/my-info') }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200}>
        <div style={{ height: '32px', margin: '16px', color: 'white', textAlign: 'center', lineHeight: '32px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.2)' }}>
          KIOSK ADMIN
        </div>
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button type="primary" icon={<LogoutOutlined />} onClick={() => navigate('/login')}>
            로그아웃
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#fff', borderRadius: '8px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
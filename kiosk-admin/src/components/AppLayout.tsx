import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Popover, Badge, Avatar, Typography, Space, Drawer } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  BellOutlined,
  ContainerOutlined,
  TeamOutlined,
  HistoryOutlined,
  AreaChartOutlined,
  ShopOutlined,
  MenuOutlined
} from '@ant-design/icons';
import api from '../api';
import NotificationPanel from './NotificationPanel';
import MobileHome from '../pages/MobileHome';
import MobilePageHeader from './MobilePageHeader';
import type { Notification } from '@kiosk/shared-types';
import './AppLayout.css';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error("알림 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    console.log('Notification clicked:', notification);
    console.log('Notification type:', notification.type);

    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));

      if (!notification.read) {
        setUnreadCount(prev => prev - 1);
      }

      if (notification.type === 'DELIVERY_PROMPT' || notification.type === 'LOW_STOCK_WARNING') {
        console.log('Navigating to /purchase-orders');
        navigate('/purchase-orders');
      } else {
        console.log('Condition not met. Type:', notification.type);
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패', error);
    } finally {
      setPopoverVisible(false);
    }
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setDrawerVisible(false);
  };

  const menuItems = [
    {
      key: 'analysis',
      label: '분석',
      type: 'group' as const,
      children: [
        { key: '/', icon: <DashboardOutlined />, label: '대시보드', onClick: () => handleMenuClick('/') },
        { key: '/reports', icon: <AreaChartOutlined />, label: '상세 리포트', onClick: () => handleMenuClick('/reports') },
      ]
    },
    {
      key: 'products',
      label: '상품 관리',
      type: 'group' as const,
      children: [
        { key: '/products', icon: <UnorderedListOutlined />, label: '상품 관리', onClick: () => handleMenuClick('/products') },
        { key: '/categories', icon: <AppstoreOutlined />, label: '카테고리 관리', onClick: () => handleMenuClick('/categories') },
        { key: '/option-groups', icon: <AppstoreOutlined />, label: '옵션 관리', onClick: () => handleMenuClick('/option-groups') },
      ]
    },
    {
      key: 'orders',
      label: '주문 및 재고',
      type: 'group' as const,
      children: [
        { key: '/orders', icon: <UnorderedListOutlined />, label: '주문 내역', onClick: () => handleMenuClick('/orders') },
        { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '발주 관리', onClick: () => handleMenuClick('/purchase-orders') },
        { key: '/inventory', icon: <ContainerOutlined />, label: '재고 관리', onClick: () => handleMenuClick('/inventory') },
        { key: '/inventory-logs', icon: <HistoryOutlined />, label: '재고 변동 내역', onClick: () => handleMenuClick('/inventory-logs') },
        { key: '/suppliers', icon: <TeamOutlined />, label: '공급업체 관리', onClick: () => handleMenuClick('/suppliers') },
      ]
    },
    {
      key: 'settings',
      label: '설정',
      type: 'group' as const,
      children: [
        { key: '/my-info', icon: <UserOutlined />, label: '내 정보', onClick: () => handleMenuClick('/my-info') }
      ]
    }
  ];

  const notificationContent = (
    <NotificationPanel
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      loading={loading}
    />
  );

  // Mobile Layout
  if (isMobile) {
    const isHomePage = location.pathname === '/';

    if (isHomePage) {
      return <MobileHome />;
    }

    return (
      <div className="mobile-layout">
        <MobilePageHeader
          unreadCount={unreadCount}
          onNotificationClick={() => setPopoverVisible(true)}
        />
        <div className="mobile-content">
          <Outlet />
        </div>

        {/* Notification Popover for Mobile */}
        <Popover
          content={notificationContent}
          title="알림"
          trigger="click"
          open={popoverVisible}
          onOpenChange={setPopoverVisible}
          placement="bottomRight"
        >
          <div style={{ display: 'none' }} />
        </Popover>
      </div>
    );
  }

  // Desktop Layout (original)
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 데스크톱용 사이드바 */}
      <Sider
        width={240}
        breakpoint="lg"
        collapsedWidth="0"
        className="sider-desktop-only"
        style={{
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          zIndex: 10
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 16
        }}>
          <Space>
            <ShopOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Text strong style={{ color: '#fff', fontSize: 18 }}>KIOSK ADMIN</Text>
          </Space>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          defaultOpenKeys={['analysis', 'products', 'orders', 'settings']}
          style={{ borderRight: 0 }}
          items={menuItems}
        />
      </Sider>

      {/* 모바일용 드로어 */}
      <Drawer
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="mobile-drawer"
        width={280}
        styles={{
          body: { padding: 0, background: '#001529' }
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 16
        }}>
          <Space>
            <ShopOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <Text strong style={{ color: '#fff', fontSize: 18 }}>KIOSK ADMIN</Text>
          </Space>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['analysis', 'products', 'orders', 'settings']}
          style={{ borderRight: 0, background: 'transparent' }}
          items={menuItems}
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => navigate('/login')}
            style={{ color: '#fff', width: '100%', justifyContent: 'flex-start' }}
          >
            로그아웃
          </Button>
        </div>
      </Drawer>

      <Layout>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          zIndex: 1
        }}>
          {/* 모바일 햄버거 메뉴 */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={() => setDrawerVisible(true)}
            className="mobile-menu-button"
          />

          {/* 모바일 로고 */}
          <div className="mobile-logo">
            <Space>
              <ShopOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <Text strong style={{ fontSize: 16 }}>KIOSK</Text>
            </Space>
          </div>

          <Space size="large">
            <Popover
              content={notificationContent}
              title="알림"
              trigger="click"
              open={popoverVisible}
              onOpenChange={setPopoverVisible}
              placement="bottomRight"
            >
              <Badge count={unreadCount} size="small">
                <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 20 }} />} />
              </Badge>
            </Popover>
            <Space className="header-desktop-only-logout">
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <Button type="text" icon={<LogoutOutlined />} onClick={() => navigate('/login')}>
                로그아웃
              </Button>
            </Space>
          </Space>
        </Header>
        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
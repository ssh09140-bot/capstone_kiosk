import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Popover,
  Badge,
  Drawer,
  Avatar,
  Typography,
  Space
} from 'antd';
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
  ShopOutlined
} from '@ant-design/icons';
import api from '../api';
import NotificationPanel from './NotificationPanel';
import MobileHome from '../pages/MobileHome';
import MobilePageHeader from './MobilePageHeader';
import type { Notification } from '@kiosk/shared-types';
import { useIsMobile } from '../hooks/useIsMobile';
import './AppLayout.css';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

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
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(prev => prev - 1);

      if (notification.type === 'DELIVERY_PROMPT' || notification.type === 'LOW_STOCK_WARNING') {
        navigate('/purchase-orders');
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패', error);
    } finally {
      setPopoverVisible(false);
    }
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setMobileMenuVisible(false);
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

  // Shared Drawer Component
  const MobileDrawer = (
    <Drawer
      title={
        <Space>
          <ShopOutlined style={{ fontSize: 24, color: '#fff' }} />
          <Text strong style={{ color: '#fff', fontSize: 18 }}>KIOSK ADMIN</Text>
        </Space>
      }
      placement="left"
      onClose={() => setMobileMenuVisible(false)}
      open={mobileMenuVisible}
      styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }, header: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' } }}
      width={280}
    >
      <Menu
        theme="dark"
        mode="inline"
        items={menuItems.map(item => {
          if (item.type === 'group') {
            return {
              ...item,
              children: item.children?.map(child => ({
                ...child,
                onClick: () => {
                  child.onClick?.();
                  setMobileMenuVisible(false);
                }
              }))
            };
          }
          return {
            ...item,
            onClick: () => {
              (item as any).onClick?.();
              setMobileMenuVisible(false);
            }
          };
        })}
        selectedKeys={[location.pathname]}
        style={{ background: 'transparent' }}
      />
    </Drawer>
  );

  // Mobile Layout
  if (isMobile) {
    const isHomePage = location.pathname === '/';

    if (isHomePage) {
      return (
        <>
          <MobileHome unreadCount={unreadCount} />
          {MobileDrawer}
        </>
      );
    }

    return (
      <div className="mobile-layout">
        <MobilePageHeader
          unreadCount={unreadCount}
          onNotificationClick={() => setPopoverVisible(true)}
          onMenuClick={() => setMobileMenuVisible(true)}
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

        {MobileDrawer}
      </div>
    );
  }

  // Desktop Layout
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Sider width={240} breakpoint="lg" collapsedWidth="0" className="sider-desktop-only">
        <div style={{
          height: '64px',
          margin: '16px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <Space>
            <ShopOutlined style={{ fontSize: 24, color: '#fff' }} />
            <Text strong style={{ color: '#fff', fontSize: 18 }}>KIOSK ADMIN</Text>
          </Space>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          selectedKeys={[location.pathname]}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>

      {/* Mobile Drawer Menu (Also rendered here for desktop responsive behavior if needed, though usually hidden) */}
      {MobileDrawer}

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          height: '64px',
          lineHeight: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}>
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
                <Button shape="circle" icon={<BellOutlined />} />
              </Badge>
            </Popover>
            <Space>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={() => navigate('/login')}
              >
                로그아웃
              </Button>
            </Space>
          </Space>
        </Header>
        <Content style={{
          margin: '24px',
          padding: 0,
        }}>
          <div style={{ minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Popover, Badge, Drawer } from 'antd';
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
    MenuOutlined,
} from '@ant-design/icons';
import api from '../api';
import NotificationPanel from './NotificationPanel';
import type { Notification } from '@kiosk/shared-types';
import BottomNav from './BottomNav';
import MobileProductSubNav from './MobileProductSubNav';
import { useIsMobile } from '../hooks/useIsMobile';
import './AppLayout.css';

const { Header, Content, Sider } = Layout;

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
    const interval = setInterval(fetchNotifications, 60000); // 1분마다 새로고침
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await api.post(`/notifications/${notification.id}/read`);
      // Optimistic update
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

  // Function to determine if MobileProductSubNav should be shown
  const shouldShowMobileProductSubNav = () => {
    const isMobile = window.innerWidth <= 767; 
    const productRelatedPaths = ['/products', '/categories', '/option-groups'];
    return isMobile && productRelatedPaths.some(path => location.pathname.startsWith(path));
  };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '대시보드', onClick: () => navigate('/') },
    { key: '/reports', icon: <AreaChartOutlined />, label: '상세 리포트', onClick: () => navigate('/reports') },
    { key: '/products', icon: <UnorderedListOutlined />, label: '상품 관리', onClick: () => navigate('/products') },
    { key: '/categories', icon: <AppstoreOutlined />, label: '카테고리 관리', onClick: () => navigate('/categories') },
    { key: '/option-groups', icon: <AppstoreOutlined />, label: '옵션 관리', onClick: () => navigate('/option-groups') },
    { key: '/orders', icon: <UnorderedListOutlined />, label: '주문 내역', onClick: () => navigate('/orders') },
    { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '발주 관리', onClick: () => navigate('/purchase-orders') },
    { key: '/inventory', icon: <ContainerOutlined />, label: '재고 관리', onClick: () => navigate('/inventory') },
    { key: '/inventory-logs', icon: <HistoryOutlined />, label: '재고 변동 내역', onClick: () => navigate('/inventory-logs') },
    { key: '/suppliers', icon: <TeamOutlined />, label: '공급업체 관리', onClick: () => navigate('/suppliers') },
    { key: '/my-info', icon: <UserOutlined />, label: '내 정보', onClick: () => navigate('/my-info') }
  ];

  const notificationContent = (
    <NotificationPanel 
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      loading={loading}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <Sider width={220} breakpoint="lg" collapsedWidth="0" className="sider-desktop-only">
        <div style={{ 
          height: '48px', 
          margin: '20px 12px', 
          color: 'white', 
          textAlign: 'center', 
          lineHeight: '48px', 
          borderRadius: '12px', 
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          fontWeight: 700,
          fontSize: '16px',
          letterSpacing: '1px',
          backdropFilter: 'blur(10px)'
        }}>
          ☕ KIOSK ADMIN
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          items={menuItems} 
          selectedKeys={[location.pathname]}
        />
      </Sider>

      {/* Mobile Drawer Menu */}
      <Drawer
        title={
          <div style={{ 
            color: 'white',
            fontSize: '18px',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            ☕ KIOSK ADMIN
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        bodyStyle={{ padding: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}
        headerStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
        width={280}
      >
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems.map(item => ({
            ...item,
            onClick: () => {
              item.onClick?.();
              setMobileMenuVisible(false);
            }
          }))}
          selectedKeys={[location.pathname]}
        />
      </Drawer>

      <Layout>
        <Header style={{ 
          padding: isMobile ? '0 16px' : '0 24px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: isMobile ? 'space-between' : 'flex-end', 
          alignItems: 'center',
          height: isMobile ? '56px' : '64px',
          lineHeight: isMobile ? '56px' : '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}>
          {isMobile && (
            <Button 
              type="text" 
              icon={<MenuOutlined />} 
              onClick={() => setMobileMenuVisible(true)}
              style={{ fontSize: '20px', color: '#667eea' }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Popover
              content={notificationContent}
              title="알림"
              trigger="click"
              open={popoverVisible}
              onOpenChange={setPopoverVisible}
              placement={isMobile ? "bottomRight" : "bottomRight"}
            >
              <Badge count={unreadCount} size="small">
                <Button 
                  shape="circle" 
                  icon={<BellOutlined />}
                  style={isMobile ? { border: 'none', boxShadow: 'none' } : {}}
                />
              </Badge>
            </Popover>
            {!isMobile && (
              <Button 
                type="primary" 
                icon={<LogoutOutlined />} 
                onClick={() => navigate('/login')} 
                style={{ marginLeft: 16 }}
              >
                로그아웃
              </Button>
            )}
          </div>
        </Header>
        <Content style={{ 
          margin: isMobile ? '16px 12px' : '24px', 
          padding: 0,
          paddingBottom: isMobile ? '80px' : '24px'
        }}>
          {shouldShowMobileProductSubNav() && <MobileProductSubNav />}
          <div style={{ minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
      {isMobile && <BottomNav />}
    </Layout>
  );
};

export default AppLayout;
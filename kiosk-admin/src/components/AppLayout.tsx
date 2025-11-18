import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Popover, Badge } from 'antd';
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
    HistoryOutlined, // Import HistoryOutlined for Logs
    AreaChartOutlined,
} from '@ant-design/icons';
import api from '../api';
import NotificationPanel from './NotificationPanel';
import type { Notification } from '@kiosk/shared-types';
import BottomNav from './BottomNav'; // Import BottomNav
import MobileProductSubNav from './MobileProductSubNav'; // Import MobileProductSubNav
import './AppLayout.css'; // Import AppLayout CSS

const { Header, Content, Sider } = Layout;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Use useLocation hook
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);

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
      <Sider width={200} breakpoint="lg" collapsedWidth="0" className="sider-desktop-only"> {/* Apply class */}
        <div style={{ height: '32px', margin: '16px', color: 'white', textAlign: 'center', lineHeight: '32px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.2)' }}>
          KIOSK ADMIN
        </div>
        <Menu theme="dark" mode="inline" items={menuItems} defaultSelectedKeys={[window.location.pathname]} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
          <Button type="primary" icon={<LogoutOutlined />} onClick={() => navigate('/login')} style={{ marginLeft: 16 }} className="header-desktop-only-logout"> {/* Apply class */}
            로그아웃
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          {shouldShowMobileProductSubNav() && <MobileProductSubNav />} {/* Conditional Mobile Product Sub-Nav */}
          <div style={{ padding: 24, minHeight: 360, background: '#fff', borderRadius: 8 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
      <BottomNav /> {/* Render BottomNav as a direct child of the outermost Layout */}
    </Layout>
  );
};

export default AppLayout;
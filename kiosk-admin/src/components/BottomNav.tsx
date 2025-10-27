import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '홈' },
    { key: '/orders', icon: <UnorderedListOutlined />, label: '주문' },
    { key: '/products', icon: <AppstoreOutlined />, label: '상품' },
    { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '발주' },
    { key: '/my-info', icon: <UserOutlined />, label: '마이' },
  ];

  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  // Determine selected key based on current path - find the longest matching prefix
  const selectedKey = menuItems.reduce((acc, item) => {
    if (location.pathname.startsWith(item.key) && item.key.length > acc.length) {
      return item.key;
    }
    return acc;
  }, '/') || '/'; // Default to '/' if no match

  return (
    <div className="bottom-nav-container">
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        onClick={handleMenuClick}
        items={menuItems}
      />
    </div>
  );
};

export default BottomNav;

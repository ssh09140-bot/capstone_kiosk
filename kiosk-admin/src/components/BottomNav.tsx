import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, Menu } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  AreaChartOutlined,
  TeamOutlined,
  MoreOutlined,
  HistoryOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  // 주요 탭 (하단에 항상 표시)
  const mainTabs = [
    { key: '/', icon: <DashboardOutlined />, label: '홈' },
    { key: '/orders', icon: <UnorderedListOutlined />, label: '주문' },
    { key: '/products', icon: <AppstoreOutlined />, label: '상품' },
    { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '발주' },
    { key: 'more', icon: <MoreOutlined />, label: '더보기' },
  ];

  // 더보기 메뉴 항목
  const moreMenuItems = [
    { key: '/reports', icon: <AreaChartOutlined />, label: '상세 리포트' },
    { key: '/inventory', icon: <ContainerOutlined />, label: '재고 관리' },
    { key: '/inventory-logs', icon: <HistoryOutlined />, label: '재고 변동 내역' },
    { key: '/suppliers', icon: <TeamOutlined />, label: '공급업체 관리' },
    { key: '/categories', icon: <FolderOutlined />, label: '카테고리 관리' },
    { key: '/my-info', icon: <UserOutlined />, label: '내 정보' },
  ];

  const handleTabClick = (key: string) => {
    if (key === 'more') {
      setMoreMenuVisible(true);
    } else {
      navigate(key);
    }
  };

  // Determine selected key based on current path
  const getSelectedKey = () => {
    // Check if current path matches any main tab
    for (const tab of mainTabs) {
      if (tab.key !== 'more' && location.pathname.startsWith(tab.key)) {
        return tab.key;
      }
    }
    // Check if current path matches any more menu item
    for (const item of moreMenuItems) {
      if (location.pathname.startsWith(item.key)) {
        return 'more';
      }
    }
    return '/';
  };

  const selectedKey = getSelectedKey();

  return (
    <>
      <div className="bottom-nav-container">
        {mainTabs.map((tab) => (
          <div
            key={tab.key}
            className={`bottom-nav-item ${selectedKey === tab.key ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.key)}
          >
            <div className="bottom-nav-icon">{tab.icon}</div>
            <div className="bottom-nav-label">{tab.label}</div>
            {selectedKey === tab.key && <div className="bottom-nav-indicator" />}
          </div>
        ))}
      </div>

      {/* 더보기 메뉴 Drawer */}
      <Drawer
        title={
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 700,
            color: '#667eea'
          }}>
            더보기
          </div>
        }
        placement="bottom"
        onClose={() => setMoreMenuVisible(false)}
        open={moreMenuVisible}
        height="auto"
        style={{ borderRadius: '20px 20px 0 0' }}
        bodyStyle={{ padding: 0 }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={moreMenuItems}
          onClick={(e) => {
            navigate(e.key);
            setMoreMenuVisible(false);
          }}
          style={{ border: 'none' }}
        />
      </Drawer>
    </>
  );
};

export default BottomNav;

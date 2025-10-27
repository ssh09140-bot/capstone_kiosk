import React from 'react';
import { Tabs } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import './MobileProductSubNav.css';

const MobileProductSubNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { label: '상품 목록', key: '/products' },
    { label: '카테고리 관리', key: '/categories' },
    { label: '옵션 관리', key: '/option-groups' },
  ];

  const activeKey = items.find(item => location.pathname.startsWith(item.key))?.key || '/products';

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  return (
    <div className="mobile-product-sub-nav-container">
      <Tabs activeKey={activeKey} onChange={handleTabChange} items={items} centered />
    </div>
  );
};

export default MobileProductSubNav;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MenuOutlined, BellOutlined, HomeOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Badge, Space } from 'antd';
import { getBreadcrumbItems } from '../config/breadcrumbConfig';
import './MobilePageHeader.css';

interface MobilePageHeaderProps {
    unreadCount?: number;
    onNotificationClick?: () => void;
    onMenuClick?: () => void;
}

const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
    unreadCount = 0,
    onNotificationClick,
    onMenuClick
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const breadcrumbItems = getBreadcrumbItems(location.pathname);

    return (
        <div className="mobile-page-header">
            <div className="mobile-header-content">
                <Space>
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        className="menu-button"
                        onClick={onMenuClick}
                        size="large"
                    />
                    <Button
                        type="text"
                        icon={<HomeOutlined />}
                        className="home-button"
                        onClick={() => navigate('/')}
                        size="large"
                    />
                </Space>

                <Breadcrumb className="mobile-breadcrumb" items={breadcrumbItems} />

                <Badge count={unreadCount} size="small">
                    <Button
                        type="text"
                        icon={<BellOutlined />}
                        className="notification-button"
                        onClick={onNotificationClick}
                        size="large"
                    />
                </Badge>
            </div>
        </div>
    );
};

export default MobilePageHeader;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, BellOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Badge } from 'antd';
import { getBreadcrumbItems } from '../config/breadcrumbConfig';
import './MobilePageHeader.css';

interface MobilePageHeaderProps {
    unreadCount?: number;
    onNotificationClick?: () => void;
}

const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({
    unreadCount = 0,
    onNotificationClick
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const breadcrumbItems = getBreadcrumbItems(location.pathname);

    return (
        <div className="mobile-page-header">
            <div className="mobile-header-content">
                <Button
                    type="text"
                    icon={<HomeOutlined />}
                    className="home-button"
                    onClick={() => navigate('/')}
                    size="large"
                />

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

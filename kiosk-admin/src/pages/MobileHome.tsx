import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DashboardOutlined,
    ShoppingOutlined,
    UnorderedListOutlined,
    ContainerOutlined,
    ShoppingCartOutlined,
    AppstoreOutlined,
    AreaChartOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Typography } from 'antd';
import './MobileHome.css';

const { Title, Text } = Typography;

interface MobileHomeProps {
    unreadCount: number;
}

const MobileHome: React.FC<MobileHomeProps> = ({ unreadCount }) => {
    const navigate = useNavigate();

    const navigationCards = [
        {
            title: '대시보드',
            description: '매장 전체 현황',
            icon: <DashboardOutlined />,
            path: '/dashboard',
            color: '#667eea',
        },
        {
            title: '상품 관리',
            description: '메뉴 상품 관리',
            icon: <ShoppingOutlined />,
            path: '/products',
            color: '#f093fb',
        },
        {
            title: '주문 내역',
            description: '주문 확인 및 처리',
            icon: <UnorderedListOutlined />,
            path: '/orders',
            color: '#4facfe',
        },
        {
            title: '재고 관리',
            description: '재고 현황 파악',
            icon: <ContainerOutlined />,
            path: '/inventory',
            color: '#43e97b',
        },
        {
            title: '발주 관리',
            description: '발주 및 입고 관리',
            icon: <ShoppingCartOutlined />,
            path: '/purchase-orders',
            color: '#fa709a',
        },
        {
            title: '카테고리 관리',
            description: '상품 분류 설정',
            icon: <AppstoreOutlined />,
            path: '/categories',
            color: '#30cfd0',
        },
        {
            title: '상세 리포트',
            description: '상세한 리포트',
            icon: <AreaChartOutlined />,
            path: '/reports',
            color: '#a8edea',
        },
        {
            title: '내 정보',
            description: '설정 및 로그아웃',
            icon: <UserOutlined />,
            path: '/my-info',
            color: '#fbc2eb',
        },
    ];

    const handleCardClick = (path: string) => {
        navigate(path);
    };

    return (
        <div className="mobile-home">
            <div className="mobile-home-header">
                <Title level={2} className="welcome-title">
                    안녕하세요 ! 👋
                </Title>
                <Text className="welcome-subtitle">
                    오늘도 좋은 하루 되세요
                </Text>
            </div>

            <div className="navigation-grid">
                {navigationCards.map((card, index) => (
                    <div
                        key={index}
                        className="nav-card"
                        onClick={() => handleCardClick(card.path)}
                    >
                        <div className="nav-card-icon-wrapper" style={{ backgroundColor: card.color }}>
                            {card.icon}
                        </div>
                        <div className="nav-card-content">
                            <div className="nav-card-title">{card.title}</div>
                            <div className="nav-card-description">{card.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MobileHome;

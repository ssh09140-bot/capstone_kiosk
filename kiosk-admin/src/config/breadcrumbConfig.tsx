import {
    HomeOutlined,
    DashboardOutlined,
    ShoppingOutlined,
    UnorderedListOutlined,
    ContainerOutlined,
    ShoppingCartOutlined,
    AppstoreOutlined,
    AreaChartOutlined,
    UserOutlined,
    TeamOutlined,
    HistoryOutlined,
} from '@ant-design/icons';
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb';

interface BreadcrumbConfig {
    label: string;
    icon?: React.ReactNode;
    parent?: string;
}

const breadcrumbRoutes: Record<string, BreadcrumbConfig> = {
    '/': {
        label: '홈',
        icon: <HomeOutlined />
    },
    '/dashboard': {
        label: '대시보드',
        icon: <DashboardOutlined />,
        parent: '/'
    },
    '/products': {
        label: '상품 관리',
        icon: <ShoppingOutlined />,
        parent: '/'
    },
    '/products/new': {
        label: '상품 추가',
        parent: '/products'
    },
    '/products/edit': {
        label: '상품 수정',
        parent: '/products'
    },
    '/orders': {
        label: '주문 내역',
        icon: <UnorderedListOutlined />,
        parent: '/'
    },
    '/inventory': {
        label: '재고 관리',
        icon: <ContainerOutlined />,
        parent: '/'
    },
    '/inventory/new': {
        label: '재고 추가',
        parent: '/inventory'
    },
    '/inventory/edit': {
        label: '재고 수정',
        parent: '/inventory'
    },
    '/purchase-orders': {
        label: '발주 관리',
        icon: <ShoppingCartOutlined />,
        parent: '/'
    },
    '/categories': {
        label: '카테고리 관리',
        icon: <AppstoreOutlined />,
        parent: '/'
    },
    '/option-groups': {
        label: '옵션 관리',
        icon: <AppstoreOutlined />,
        parent: '/'
    },
    '/reports': {
        label: '상세 리포트',
        icon: <AreaChartOutlined />,
        parent: '/'
    },
    '/my-info': {
        label: '내 정보',
        icon: <UserOutlined />,
        parent: '/'
    },
    '/suppliers': {
        label: '공급업체 관리',
        icon: <TeamOutlined />,
        parent: '/'
    },
    '/inventory-logs': {
        label: '재고 변동 내역',
        icon: <HistoryOutlined />,
        parent: '/'
    }
};

export const getBreadcrumbItems = (pathname: string): BreadcrumbItemType[] => {
    const items: BreadcrumbItemType[] = [];
    let currentPath = pathname;

    // Build breadcrumb trail by following parent relationships
    while (currentPath) {
        const config = breadcrumbRoutes[currentPath];
        if (!config) break;

        items.unshift({
            title: (
                <span>
                    {config.icon && <span style={{ marginRight: 6 }}>{config.icon}</span>}
                    {config.label}
                </span>
            ),
        });

        currentPath = config.parent || '';
    }

    // If no breadcrumb config found, show just the current page
    if (items.length === 0) {
        items.push({
            title: <span><HomeOutlined style={{ marginRight: 6 }} /> 홈</span>
        });
    }

    return items;
};

export default breadcrumbRoutes;

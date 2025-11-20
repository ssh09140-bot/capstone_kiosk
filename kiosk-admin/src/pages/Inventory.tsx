import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInventory, deleteInventoryItem, type Inventory } from '../api';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import { useIsMobile } from '../hooks/useIsMobile';

const { Title } = Typography;

const InventoryPage: React.FC = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<(Inventory & { key: string })[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getInventory();
            const dataWithKeys = response.map((item: Inventory) => ({ ...item, key: item.id.toString() }));
            setInventory(dataWithKeys);
        } catch (error) {
            console.error("재고 목록 로딩 실패:", error);
            message.error('재고 목록을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleDelete = async (id: number) => {
        if (window.confirm(`정말로 이 품목을 삭제하시겠습니까?`)) {
            try {
                await deleteInventoryItem(id);
                message.success('재고 품목이 삭제되었습니다.');
                fetchInventory();
            } catch (error) {
                message.error('재고 품목 삭제에 실패했습니다.');
            }
        }
    };

    const columns = [
        { 
            title: '품목명', 
            dataIndex: 'name', 
            key: 'name',
            width: isMobile ? 120 : 150,
            fixed: isMobile ? 'left' : undefined,
        },
        { 
            title: '현재 수량', 
            dataIndex: 'quantity', 
            key: 'quantity',
            width: isMobile ? 80 : 100,
        },
        { 
            title: '단위', 
            dataIndex: 'unit', 
            key: 'unit',
            width: isMobile ? 60 : 80,
        },
        { 
            title: '품목 유형', 
            dataIndex: 'itemType', 
            key: 'itemType',
            width: isMobile ? 100 : 120,
            ellipsis: true,
        },
        {
            title: '자동 발주',
            dataIndex: 'autoOrderEnabled',
            key: 'autoOrderEnabled',
            width: isMobile ? 80 : 100,
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'blue' : 'default'} style={{ fontSize: isMobile ? '11px' : '12px' }}>
                    {enabled ? 'ON' : 'OFF'}
                </Tag>
            ),
        },
        {
            title: '발주 기준',
            dataIndex: 'minStockThreshold',
            key: 'minStockThreshold',
            width: isMobile ? 90 : 120,
            render: (stock?: number | null) => (stock != null ? `${stock} 이하` : '-'),
        },
        {
            title: '발주 수량',
            dataIndex: 'orderQuantity',
            key: 'orderQuantity',
            width: isMobile ? 80 : 100,
            render: (quantity?: number | null) => (quantity != null ? `${quantity}` : '-'),
        },
        {
            title: '관리',
            key: 'action',
            fixed: isMobile ? 'right' : undefined,
            width: isMobile ? 100 : 140,
            render: (_: any, record: Inventory) => (
                <Space size="small" direction={isMobile ? 'vertical' : 'horizontal'}>
                    <Button 
                        onClick={() => navigate(`/inventory/${record.id}`)}
                        size={isMobile ? 'small' : 'middle'}
                        block={isMobile}
                    >
                        수정
                    </Button>
                    <Button 
                        danger 
                        onClick={() => handleDelete(record.id)}
                        size={isMobile ? 'small' : 'middle'}
                        block={isMobile}
                    >
                        삭제
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Flex 
                justify="space-between" 
                align="center" 
                wrap="wrap" 
                style={{ marginBottom: isMobile ? '16px' : '24px' }}
                vertical={isMobile}
            >
                <Title 
                    level={isMobile ? 4 : 3} 
                    style={{ 
                        margin: 0,
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 700
                    }}
                >
                    재고 관리
                </Title>
                <Space 
                    direction={isMobile ? 'vertical' : 'horizontal'}
                    style={{ 
                        marginTop: isMobile ? '12px' : '8px',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    <Button 
                        icon={<RedoOutlined />} 
                        onClick={fetchInventory} 
                        loading={loading}
                        block={isMobile}
                    >
                        새로고침
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => navigate('/inventory/new')}
                        block={isMobile}
                        size={isMobile ? 'large' : 'middle'}
                    >
                        새 품목 등록
                    </Button>
                </Space>
            </Flex>
            <Table 
                columns={columns} 
                dataSource={inventory} 
                loading={loading} 
                scroll={{ x: 'max-content' }}
                size={isMobile ? 'small' : 'middle'}
                pagination={isMobile ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20 }}
            />
        </>
    );
};

export default InventoryPage;

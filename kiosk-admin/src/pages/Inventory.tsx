import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Tag, Card, Progress, type TableProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInventory, deleteInventoryItem, type Inventory } from '../api';
import { PlusOutlined, RedoOutlined, EditOutlined, DeleteOutlined, InboxOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useIsMobile } from '../hooks/useIsMobile';
import './Inventory.css';

const { Title, Text } = Typography;

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

    const getStockStatus = (quantity: number, minThreshold?: number | null) => {
        if (!minThreshold) return { color: 'default', text: '정상', percent: 100 };
        const percent = (quantity / minThreshold) * 100;
        if (quantity <= minThreshold * 0.5) return { color: 'red', text: '부족', percent };
        if (quantity <= minThreshold) return { color: 'orange', text: '주의', percent };
        return { color: 'green', text: '충분', percent: Math.min(percent, 100) };
    };

    const columns: TableProps<Inventory & { key: string }>['columns'] = [
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

    // Mobile Card View
    const renderMobileCards = () => (
        <div className="inventory-cards-container">
            {inventory.map(item => {
                const stockStatus = getStockStatus(item.quantity, item.minStockThreshold);
                return (
                    <Card
                        key={item.id}
                        className="inventory-card"
                        hoverable
                        onClick={() => navigate(`/inventory/${item.id}`)}
                    >
                        <div className="inventory-card-header">
                            <div className="inventory-icon">
                                <InboxOutlined />
                            </div>
                            <div className="inventory-info">
                                <Text strong className="inventory-name">{item.name}</Text>
                                <Tag color="default" style={{ marginTop: 4 }}>{item.itemType}</Tag>
                            </div>
                        </div>

                        <div className="inventory-card-body">
                            <div className="inventory-quantity-section">
                                <div className="quantity-display">
                                    <Text type="secondary" style={{ fontSize: 12 }}>현재 재고</Text>
                                    <Text strong style={{ fontSize: 24, color: '#1677ff' }}>
                                        {item.quantity}
                                    </Text>
                                    <Text type="secondary">{item.unit}</Text>
                                </div>
                                {item.minStockThreshold && (
                                    <div className="stock-status">
                                        <Progress
                                            percent={stockStatus.percent}
                                            strokeColor={stockStatus.color === 'red' ? '#ff4d4f' : stockStatus.color === 'orange' ? '#faad14' : '#52c41a'}
                                            showInfo={false}
                                            size="small"
                                        />
                                        <Tag color={stockStatus.color} style={{ marginTop: 4 }}>
                                            {stockStatus.text}
                                        </Tag>
                                    </div>
                                )}
                            </div>

                            {item.autoOrderEnabled && (
                                <div className="auto-order-badge">
                                    <ThunderboltOutlined style={{ marginRight: 4 }} />
                                    자동 발주 활성화
                                    {item.minStockThreshold && (
                                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                            기준: {item.minStockThreshold}{item.unit} / 수량: {item.orderQuantity}
                                        </Text>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="inventory-card-footer">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/inventory/${item.id}`);
                                }}
                            >
                                수정
                            </Button>
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id);
                                }}
                            >
                                삭제
                            </Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );

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

            {isMobile ? (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text>로딩 중...</Text>
                        </div>
                    ) : inventory.length === 0 ? (
                        <Card style={{ textAlign: 'center', padding: '40px' }}>
                            <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                            <Text type="secondary">재고 품목이 없습니다.</Text>
                        </Card>
                    ) : (
                        renderMobileCards()
                    )}
                    {/* Floating Action Button */}
                    <Button
                        type="primary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        size="large"
                        className="mobile-fab"
                        onClick={() => navigate('/inventory/new')}
                        style={{
                            position: 'fixed',
                            bottom: '80px',
                            right: '24px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            zIndex: 1000
                        }}
                    />
                </>
            ) : (
                <Table
                    columns={columns}
                    dataSource={inventory}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    size={isMobile ? 'small' : 'middle'}
                    pagination={isMobile ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20 }}
                />
            )}
        </>
    );
};

export default InventoryPage;

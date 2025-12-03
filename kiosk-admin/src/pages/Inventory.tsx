import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Typography, Flex, message, Tag, Card, Progress, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInventory, deleteInventoryItem, type Inventory } from '../api';
import { PlusOutlined, RedoOutlined, EditOutlined, DeleteOutlined, InboxOutlined, ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import './Inventory.css';

const { Title, Text } = Typography;

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<(Inventory & { key: string })[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const filteredInventory = inventory
        .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            // 1. 자동 발주 활성화 된 것 먼저
            if (a.autoOrderEnabled && !b.autoOrderEnabled) return -1;
            if (!a.autoOrderEnabled && b.autoOrderEnabled) return 1;

            // 2. 재고 부족한 순서대로 (비율이 낮은 순서)
            const getRatio = (item: Inventory) => {
                if (!item.minStockThreshold) return 100; // 기준 없으면 충분한 것으로 간주
                return item.quantity / item.minStockThreshold;
            };

            const ratioA = getRatio(a);
            const ratioB = getRatio(b);

            return ratioA - ratioB;
        });

    // Desktop Card View
    const renderDesktopCards = () => (
        <div className="inventory-desktop-grid">
            {filteredInventory.map(item => {
                const stockStatus = getStockStatus(item.quantity, item.minStockThreshold);
                return (
                    <Card
                        key={item.id}
                        className="inventory-card-desktop"
                        hoverable
                        onClick={() => navigate(`/inventory/${item.id}`)}
                    >
                        <div className="inventory-desktop-header">
                            <div className="inventory-desktop-icon">
                                <InboxOutlined />
                            </div>
                            <div className="inventory-desktop-info">
                                <Text strong className="inventory-desktop-name">{item.name}</Text>
                                <Tag color="default">{item.itemType}</Tag>
                            </div>
                        </div>

                        <div className="inventory-desktop-body">
                            <div className="inventory-desktop-quantity">
                                <div className="quantity-label-desktop">
                                    <Text type="secondary" style={{ fontSize: 13 }}>현재 재고</Text>
                                </div>
                                <div className="quantity-value-desktop">
                                    <Text strong style={{ fontSize: 26, color: '#1677ff', lineHeight: 1 }}>
                                        {item.quantity}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 14, marginLeft: 6 }}>{item.unit}</Text>
                                </div>
                            </div>

                            {item.minStockThreshold && (
                                <div className="stock-status-desktop">
                                    <Progress
                                        percent={Math.round(stockStatus.percent)}
                                        strokeColor={
                                            stockStatus.color === 'red' ? '#ff4d4f' :
                                                stockStatus.color === 'orange' ? '#faad14' : '#52c41a'
                                        }
                                        trailColor="#f0f0f0"
                                        size="small"
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <Tag color={stockStatus.color}>{stockStatus.text}</Tag>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            기준: {item.minStockThreshold}{item.unit}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            {item.autoOrderEnabled && (
                                <div className="auto-order-badge-desktop">
                                    <div className="auto-order-header-desktop">
                                        <ThunderboltOutlined style={{ marginRight: 6, fontSize: 14 }} />
                                        <Text strong style={{ fontSize: 13 }}>자동 발주 활성화</Text>
                                    </div>
                                    {item.orderQuantity && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            발주 수량: {item.orderQuantity}{item.unit}
                                        </Text>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="inventory-desktop-footer">
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/inventory/${item.id}`);
                                }}
                            >
                                수정
                            </Button>
                            <Button
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

    // Mobile Card View
    const renderMobileCards = () => (
        <div className="inventory-cards-container">
            {filteredInventory.map(item => {
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
        <div className="inventory-container">
            <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: isMobile ? '16px' : '24px' }}>
                <Title level={3} style={{ margin: 0 }}>재고 관리</Title>
                {!isMobile && (
                    <Space style={{ marginTop: '8px' }}>
                        <Button icon={<RedoOutlined />} onClick={fetchInventory} loading={loading}>
                            새로고침
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/new')}>
                            새 품목 등록
                        </Button>
                    </Space>
                )}
            </Flex>

            <div style={{ marginBottom: 24 }}>
                <Input
                    placeholder="재고 품목 검색..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="large"
                    allowClear
                />
            </div>

            {isMobile ? (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text>로딩 중...</Text>
                        </div>
                    ) : filteredInventory.length === 0 ? (
                        <Card style={{ textAlign: 'center', padding: '40px' }}>
                            <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                            <Text type="secondary">
                                {searchTerm ? '검색 결과가 없습니다.' : '재고 품목이 없습니다.'}
                            </Text>
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
                    />
                </>
            ) : (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text>로딩 중...</Text>
                        </div>
                    ) : filteredInventory.length === 0 ? (
                        <Card style={{ textAlign: 'center', padding: '40px' }}>
                            <InboxOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                            <Text type="secondary">
                                {searchTerm ? '검색 결과가 없습니다.' : '재고 품목이 없습니다.'}
                            </Text>
                        </Card>
                    ) : (
                        renderDesktopCards()
                    )}
                </>
            )}
        </div>
    );
};

export default InventoryPage;

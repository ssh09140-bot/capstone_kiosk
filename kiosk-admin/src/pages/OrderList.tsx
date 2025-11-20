import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, message, Button, Modal, Descriptions, DatePicker, Space, Card, Tag } from 'antd';
import api from '../api';
import dayjs from 'dayjs';
import { EyeOutlined, ShoppingCartOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import './OrderList.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Order {
    key: string;
    id: number;
    totalAmount: number;
    createdAt: string;
    storeId: string;
    orderItems: any[];
}

const OrderList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = dateRange ? {
                startDate: dateRange[0]?.startOf('day').toISOString(),
                endDate: dateRange[1]?.endOf('day').toISOString(),
            } : {};

            const response = await api.get('/orders', { params });
            setOrders(response.data.map((item: any) => ({ ...item, key: item.id.toString() })));
        } catch (error) {
            message.error('주문 내역을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const showDetailModal = async (orderId: number) => {
        try {
            const response = await api.get(`/orders/${orderId}`);
            setSelectedOrder(response.data);
            setIsDetailModalVisible(true);
        } catch (error) {
            message.error('주문 상세 정보를 불러오는데 실패했습니다.');
        }
    };

    const columns = [
        { title: '주문 번호', dataIndex: 'id', key: 'id' },
        { title: '주문 일시', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleString('ko-KR') },
        { title: '총 주문 금액', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number) => `${amount.toLocaleString()}원` },
        {
            title: '상세보기',
            key: 'action',
            render: (_: any, record: Order) => (
                <Button onClick={() => showDetailModal(record.id)}>상세보기</Button>
            ),
        },
    ];

    // Mobile Card View
    const renderMobileCards = () => (
        <div className="order-cards-container">
            {orders.map(order => (
                <Card
                    key={order.id}
                    className="order-card"
                    hoverable
                    onClick={() => showDetailModal(order.id)}
                >
                    <div className="order-card-header">
                        <div className="order-icon">
                            <ShoppingCartOutlined />
                        </div>
                        <div className="order-main-info">
                            <Text strong className="order-number">주문 #{order.id}</Text>
                            <div className="order-date">
                                <CalendarOutlined style={{ fontSize: 12, marginRight: 4 }} />
                                {new Date(order.createdAt).toLocaleString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="order-card-footer">
                        <div className="order-amount">
                            <DollarOutlined style={{ marginRight: 4 }} />
                            <Text strong style={{ fontSize: 18, color: '#1677ff' }}>
                                {order.totalAmount.toLocaleString()}원
                            </Text>
                        </div>
                        <Button
                            type="primary"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                showDetailModal(order.id);
                            }}
                        >
                            상세
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="order-list-container">
            <Title level={3} style={{ marginBottom: isMobile ? 16 : 24 }}>주문 내역</Title>

            <Space style={{ marginBottom: 16 }} wrap direction={isMobile ? 'vertical' : 'horizontal'} className="order-filter-controls">
                <RangePicker
                    onChange={(dates) => setDateRange(dates as any)}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                    placeholder={['시작일', '종료일']}
                />
                <Button onClick={() => setDateRange(null)} style={{ width: isMobile ? '100%' : 'auto' }}>
                    날짜 필터 초기화
                </Button>
            </Space>

            {isMobile ? (
                loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Text>로딩 중...</Text>
                    </div>
                ) : orders.length === 0 ? (
                    <Card style={{ textAlign: 'center', padding: '40px' }}>
                        <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Text type="secondary">주문 내역이 없습니다.</Text>
                    </Card>
                ) : (
                    renderMobileCards()
                )
            ) : (
                <Table columns={columns} dataSource={orders} loading={loading} scroll={{ x: 'max-content' }} />
            )}

            <Modal
                title={`주문 #${selectedOrder?.id} 상세 내역`}
                open={isDetailModalVisible}
                onOk={() => setIsDetailModalVisible(false)}
                onCancel={() => setIsDetailModalVisible(false)}
                footer={<Button key="ok" type="primary" onClick={() => setIsDetailModalVisible(false)}>닫기</Button>}
                width={isMobile ? '100%' : 600}
                style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0, padding: 0 } : {}}
            >
                {selectedOrder && (
                    <Descriptions bordered column={1} size={isMobile ? 'small' : 'default'}>
                        <Descriptions.Item label="주문 일시">{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</Descriptions.Item>
                        <Descriptions.Item label="총 금액">
                            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>
                                {selectedOrder.totalAmount.toLocaleString()}원
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="주문 상품">
                            {selectedOrder.orderItems.map(item => (
                                <div key={item.id} className="order-item-detail">
                                    <div className="order-item-main">
                                        <Text strong>{item.product.name}</Text>
                                        <Tag color="blue">{item.quantity}개</Tag>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        개당 {item.pricePerItem.toLocaleString()}원
                                    </Text>
                                    {item.selectedOptions && Object.values(item.selectedOptions).length > 0 && (
                                        <div className="order-item-options">
                                            {Object.values(item.selectedOptions as any).map((opt: any, idx: number) => (
                                                <Tag key={idx} color="default" style={{ marginTop: 4 }}>
                                                    {opt.optionName}
                                                </Tag>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default OrderList;
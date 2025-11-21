import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, message, Button, Modal, Descriptions, DatePicker, Flex, Card, Tag, type TableProps } from 'antd';
import api from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
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
    const isMobile = useIsMobile();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

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

    // 테이블 컬럼(열) 구조 정의
    const columns: TableProps<Order>['columns'] = [
        {
            title: '주문 번호',
            dataIndex: 'id',
            key: 'id',
            width: isMobile ? 80 : 100,
            fixed: isMobile ? 'left' : undefined,
        },
        {
            title: '주문 일시',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: isMobile ? 140 : 180,
            render: (date: string) => {
                const dateObj = new Date(date);
                if (isMobile) {
                    return `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                }
                return dateObj.toLocaleString('ko-KR');
            }
        },
        {
            title: '총 주문 금액',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: isMobile ? 100 : 140,
            render: (amount: number) => `${amount.toLocaleString()}원`
        },
        {
            title: '상세보기',
            key: 'action',
            fixed: isMobile ? 'right' : undefined,
            width: isMobile ? 80 : 100,
            render: (_: any, record: Order) => (
                <Button
                    onClick={() => showDetailModal(record.id)}
                    size={isMobile ? 'small' : 'middle'}
                >
                    상세
                </Button>
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
        <>
            <Title
                level={isMobile ? 4 : 3}
                style={{
                    marginBottom: isMobile ? '16px' : '24px',
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 700
                }}
            >
                주문 내역
            </Title>
            <Flex
                vertical={isMobile}
                gap={isMobile ? 12 : 16}
                style={{ marginBottom: isMobile ? 16 : 24 }}
            >
                <RangePicker
                    onChange={(dates) => setDateRange(dates as any)}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                    size={isMobile ? 'middle' : 'large'}
                />
                <Button
                    onClick={() => setDateRange(null)}
                    block={isMobile}
                >
                    날짜 필터 초기화
                </Button>
            </Flex>

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
                <Table
                    columns={columns}
                    dataSource={orders}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    size={isMobile ? 'small' : 'middle'}
                    pagination={isMobile ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20 }}
                />
            )}

            <Modal
                title={`주문 #${selectedOrder?.id} 상세 내역`}
                open={isDetailModalVisible}
                onOk={() => setIsDetailModalVisible(false)}
                onCancel={() => setIsDetailModalVisible(false)}
                footer={<Button key="ok" type="primary" onClick={() => setIsDetailModalVisible(false)}>닫기</Button>}
                width={isMobile ? '90%' : 600}
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
        </>
    );
};

export default OrderList;
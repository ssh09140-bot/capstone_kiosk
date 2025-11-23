import React, { useState, useEffect, useCallback } from 'react';
import { Typography, message, Button, Modal, Descriptions, DatePicker, Space, Card, Tag, Statistic, Row, Col, Pagination } from 'antd';
import api from '../api';
import dayjs from 'dayjs';
import { EyeOutlined, ShoppingCartOutlined, CalendarOutlined, DollarOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
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
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(15);

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

    // Reset to first page when orders change
    useEffect(() => {
        setCurrentPage(1);
    }, [orders.length, dateRange]);

    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Desktop Card View
    const renderDesktopCards = () => (
        <div className="order-desktop-container">
            <div className="order-timeline">
                {paginatedOrders.map((order, index) => (
                    <div key={order.id} className="order-timeline-item">
                        <div className="order-timeline-marker">
                            <div className="order-timeline-dot">
                                <ShoppingCartOutlined />
                            </div>
                            {index !== paginatedOrders.length - 1 && <div className="order-timeline-line" />}
                        </div>
                        <Card
                            className="order-card-desktop"
                            hoverable
                            onClick={() => showDetailModal(order.id)}
                        >
                            <div className="order-card-desktop-header">
                                <div className="order-desktop-main">
                                    <Text className="order-desktop-number">주문 #{order.id}</Text>
                                    <div className="order-desktop-date">
                                        <ClockCircleOutlined style={{ fontSize: 14, marginRight: 6 }} />
                                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                                    </div>
                                </div>
                                <div className="order-desktop-amount-wrapper">
                                    <Statistic
                                        value={order.totalAmount}
                                        precision={0}
                                        valueStyle={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}
                                        suffix="원"
                                    />
                                </div>
                            </div>
                            <div className="order-card-desktop-footer">
                                <div className="order-items-preview">
                                    <FileTextOutlined style={{ marginRight: 6 }} />
                                    <Text type="secondary">
                                        {order.orderItems?.length || 0}개 항목
                                    </Text>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<EyeOutlined />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        showDetailModal(order.id);
                                    }}
                                >
                                    상세보기
                                </Button>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );

    // Mobile Card View (Enhanced)
    const renderMobileCards = () => (
        <div className="order-cards-container">
            {paginatedOrders.map(order => (
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
            <div className="order-header">
                <div>
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0, fontWeight: 800 }}>주문 내역</Title>
                    {!isMobile && <Text type="secondary">매장의 모든 주문을 한눈에 확인하세요</Text>}
                </div>
            </div>

            {/* Statistics Cards - Desktop Only */}
            {!isMobile && orders.length > 0 && (
                <Row gutter={16} style={{ marginBottom: 32 }}>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic
                                title="총 주문 수"
                                value={orders.length}
                                prefix={<ShoppingCartOutlined />}
                                valueStyle={{ color: '#1677ff' }}
                                suffix="건"
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic
                                title="총 매출액"
                                value={totalRevenue}
                                precision={0}
                                prefix={<DollarOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                                suffix="원"
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card className="stat-card">
                            <Statistic
                                title="평균 주문 금액"
                                value={averageOrderValue}
                                precision={0}
                                prefix={<FileTextOutlined />}
                                valueStyle={{ color: '#faad14' }}
                                suffix="원"
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Space
                style={{ marginBottom: 24, width: '100%' }}
                wrap
                direction={isMobile ? 'vertical' : 'horizontal'}
                className="order-filter-controls"
            >
                <RangePicker
                    onChange={(dates) => setDateRange(dates as any)}
                    style={{ width: isMobile ? '100%' : 'auto' }}
                    placeholder={['시작일', '종료일']}
                />
                <Button onClick={() => setDateRange(null)} style={{ width: isMobile ? '100%' : 'auto' }}>
                    날짜 필터 초기화
                </Button>
            </Space>

            {loading ? (
                <div className="loading-state">
                    <Text>로딩 중...</Text>
                </div>
            ) : orders.length === 0 ? (
                <Card className="empty-state">
                    <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                    <Text type="secondary">주문 내역이 없습니다.</Text>
                </Card>
            ) : (
                <>
                    {isMobile ? renderMobileCards() : renderDesktopCards()}

                    {/* Pagination */}
                    {orders.length > pageSize && (
                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                current={currentPage}
                                total={orders.length}
                                pageSize={pageSize}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                                showTotal={(total, range) => `${range[0]}-${range[1]} / 총 ${total}건`}
                            />
                        </div>
                    )}
                </>
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
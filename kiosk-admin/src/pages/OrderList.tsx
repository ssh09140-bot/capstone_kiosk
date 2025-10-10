import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, message, Button, Modal, Descriptions, DatePicker, Space } from 'antd';
import api from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// 주문 데이터의 타입을 명확하게 정의합니다.
interface Order {
    key: string;
    id: number;
    totalAmount: number;
    createdAt: string;
    storeId: string;
    orderItems: any[]; // 상세 내역을 담을 배열
}

const OrderList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

    // 주문 내역 목록을 서버에서 불러오는 함수
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            // 날짜 범위가 선택되었다면, API 요청에 파라미터로 포함시킴
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
    }, [dateRange]); // dateRange 상태가 바뀔 때마다 이 함수가 새로 정의됨

    // 페이지가 처음 열리거나, fetchOrders 함수가 변경될 때 주문 내역을 불러옴
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // '상세보기' 버튼을 눌렀을 때 특정 주문의 상세 정보를 불러오는 함수
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

    return (
        <>
            <Title level={3}>주문 내역</Title>
            <Space style={{ marginBottom: 16 }}>
                <RangePicker onChange={(dates) => setDateRange(dates as any)} />
                <Button onClick={() => setDateRange(null)}>날짜 필터 초기화</Button>
            </Space>
            <Table columns={columns} dataSource={orders} loading={loading} />
            <Modal
                title={`주문 #${selectedOrder?.id} 상세 내역`}
                open={isDetailModalVisible}
                onOk={() => setIsDetailModalVisible(false)}
                onCancel={() => setIsDetailModalVisible(false)}
                footer={<Button key="ok" type="primary" onClick={() => setIsDetailModalVisible(false)}>닫기</Button>}
                width={700}
            >
                {selectedOrder && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="주문 일시">{new Date(selectedOrder.createdAt).toLocaleString('ko-KR')}</Descriptions.Item>
                        <Descriptions.Item label="총 금액">{selectedOrder.totalAmount.toLocaleString()}원</Descriptions.Item>
                        <Descriptions.Item label="주문 상품">
                            {selectedOrder.orderItems.map(item => (
                                <div key={item.id} style={{ marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                                    <Text strong>{item.product.name}</Text> - {item.quantity}개 (개당 {item.pricePerItem.toLocaleString()}원)
                                    {item.selectedOptions && Object.values(item.selectedOptions).length > 0 && (
                                        <div style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
                                            └ {Object.values(item.selectedOptions as any).map((opt: any) => opt.optionName).join(', ')}
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
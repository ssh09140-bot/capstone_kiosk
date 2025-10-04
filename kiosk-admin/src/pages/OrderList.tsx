import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, message, Button, Modal, Descriptions } from 'antd';
import api from '../api';

const { Title, Text } = Typography;

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

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/orders');
            setOrders(response.data.map((item: any) => ({ ...item, key: item.id.toString() })));
        } catch (error) {
            message.error('주문 내역을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

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

    return (
        <>
            <Title level={3}>주문 내역</Title>
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
                                <div key={item.id} style={{ marginBottom: '10px' }}>
                                    <Text strong>{item.product.name}</Text> - {item.quantity}개 (개당 {item.pricePerItem.toLocaleString()}원)
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
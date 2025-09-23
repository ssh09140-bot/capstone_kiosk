import React, { useState, useEffect, useCallback } from 'react';
import { Table, Typography, message } from 'antd';
import api from '../api'; // ### axios 대신, 똑똑한 비서 'api'를 import 합니다. ###

const { Title } = Typography;

interface Order {
    key: string;
    id: number;
    totalAmount: number;
    createdAt: string;
    storeId: string;
}

const OrderList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            // ### 이제 'api'를 통해 요청하므로, 자동으로 로그인 토큰이 포함됩니다. ###
            const response = await api.get('/orders');
            const dataWithKeys = response.data.map((item: any) => ({
                ...item,
                key: item.id.toString(),
            }));
            setOrders(dataWithKeys);
        } catch (error) {
            console.error("주문 내역 로딩 실패: ", error);
            message.error('주문 내역을 불러오는 데 실패했습니다. 다시 로그인해주세요.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const columns = [
        { title: '주문 번호', dataIndex: 'id', key: 'id' },
        { title: '주문 일시', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleString('ko-KR') },
        { title: '총 주문 금액', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number) => `${amount.toLocaleString()}원` },
        { title: '가게 ID', dataIndex: 'storeId', key: 'storeId' },
    ];

    return (
        <>
            <Title level={3} style={{ marginBottom: '24px' }}>주문 내역</Title>
            <Table columns={columns} dataSource={orders} loading={loading} />
        </>
    );
};

export default OrderList;
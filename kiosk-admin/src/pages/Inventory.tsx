import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInventory, deleteInventoryItem, Inventory } from '../api';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface InventoryItem extends Inventory {
    key: string;
    autoOrderEnabled: boolean;
    minStockThreshold?: number;
    orderQuantity?: number;
}

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getInventory();
            const dataWithKeys = response.map((item: any) => ({ ...item, key: item.id.toString() }));
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
        { title: '품목명', dataIndex: 'name', key: 'name' },
        { title: '현재 수량', dataIndex: 'quantity', key: 'quantity' },
        { title: '단위', dataIndex: 'unit', key: 'unit' },
        {
            title: '자동 발주',
            dataIndex: 'autoOrderEnabled',
            key: 'autoOrderEnabled',
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'blue' : 'default'}>{enabled ? 'ON' : 'OFF'}</Tag>
            ),
        },
        {
            title: '발주 기준 재고',
            dataIndex: 'minStockThreshold',
            key: 'minStockThreshold',
            render: (stock?: number) => (stock ? `${stock} 이하` : '-'),
        },
        {
            title: '자동 발주 수량',
            dataIndex: 'orderQuantity',
            key: 'orderQuantity',
            render: (quantity?: number) => (quantity ? `${quantity}` : '-'),
        },
        {
            title: '관리',
            key: 'action',
            render: (_: any, record: InventoryItem) => (
                <Space size="middle">
                    <Button onClick={() => navigate(`/inventory/${record.id}`)}>수정</Button>
                    <Button danger onClick={() => handleDelete(record.id)}>삭제</Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: '24px' }}>
                <Title level={3} style={{ margin: 0 }}>재고 관리</Title>
                <Space style={{ marginTop: '8px' }}>
                    <Button icon={<RedoOutlined />} onClick={fetchInventory} loading={loading}>
                        새로고침
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/inventory/new')}>
                        새 품목 등록
                    </Button>
                </Space>
            </Flex>
            <Table columns={columns} dataSource={inventory} loading={loading} scroll={{ x: 'max-content' }} />
        </>
    );
};

export default InventoryPage;

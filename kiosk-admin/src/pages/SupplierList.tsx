import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier, Supplier, SupplierInventory } from '../api';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface SupplierItem extends Supplier {
    key: string;
}

const SupplierList: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getSuppliers();
            const dataWithKeys = response.map((item: Supplier) => ({ ...item, key: item.id.toString() }));
            setSuppliers(dataWithKeys);
        } catch (error) {
            console.error("공급업체 목록 로딩 실패:", error);
            message.error('공급업체 목록을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handleDelete = async (id: number) => {
        if (window.confirm(`정말로 이 공급업체를 삭제하시겠습니까? 이 공급처와 연결된 모든 품목 정보도 함께 삭제됩니다.`)) {
            try {
                await deleteSupplier(id);
                message.success('공급업체가 삭제되었습니다.');
                fetchSuppliers();
            } catch (error) {
                message.error('공급업체 삭제에 실패했습니다.');
            }
        }
    };

    const columns = [
        { title: '공급업체명', dataIndex: 'name', key: 'name', fixed: 'left' as const, width: 150 },
        { title: '연락처', dataIndex: 'contact', key: 'contact', width: 150 },
        { title: '이메일', dataIndex: 'email', key: 'email', width: 200 },
        { title: '주소', dataIndex: 'address', key: 'address', width: 250 },
        {
            title: '공급 품목',
            dataIndex: 'supplies',
            key: 'supplies',
            render: (supplies: SupplierInventory[] | undefined) => {
                if (!supplies || supplies.length === 0) {
                    return '-';
                }
                return (
                    <Flex gap="4px 0" wrap="wrap">
                        {supplies.map(s => (
                            <Tag key={s.id}>{s.inventory.name}</Tag>
                        ))}
                    </Flex>
                );
            },
        },
        {
            title: '관리',
            key: 'action',
            fixed: 'right' as const,
            width: 180,
            render: (_: any, record: SupplierItem) => (
                <Space size="middle">
                    <Button onClick={() => navigate(`/suppliers/${record.id}`)}>수정</Button>
                    <Button danger onClick={() => handleDelete(record.id)}>삭제</Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: '24px' }}>
                <Title level={3} style={{ margin: 0 }}>공급업체 관리</Title>
                <Space style={{ marginTop: '8px' }}>
                    <Button icon={<RedoOutlined />} onClick={fetchSuppliers} loading={loading}>
                        새로고침
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/suppliers/new')}>
                        새 공급업체 등록
                    </Button>
                </Space>
            </Flex>
            <Table columns={columns} dataSource={suppliers} loading={loading} scroll={{ x: 'max-content' }} />
        </>
    );
};

export default SupplierList;

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier, Supplier } from '../api';
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
        if (window.confirm(`정말로 이 공급업체를 삭제하시겠습니까?`)) {
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
        { title: '공급업체명', dataIndex: 'name', key: 'name' },
        { title: '연락처', dataIndex: 'contact', key: 'contact' },
        { title: '이메일', dataIndex: 'email', key: 'email' },
        { title: '주소', dataIndex: 'address', key: 'address' },
        {
            title: '관리',
            key: 'action',
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

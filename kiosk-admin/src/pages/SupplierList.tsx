import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getSuppliers, deleteSupplier, type Supplier, type SupplierInventory } from '../api';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';
import { useIsMobile } from '../hooks/useIsMobile';

const { Title } = Typography;

interface SupplierItem extends Supplier {
    key: string;
}

const SupplierList: React.FC = () => {
    const isMobile = useIsMobile();
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
        { 
            title: '공급업체명', 
            dataIndex: 'name', 
            key: 'name', 
            fixed: isMobile ? ('left' as const) : undefined, 
            width: isMobile ? 120 : 150 
        },
        { 
            title: '연락처', 
            dataIndex: 'contact', 
            key: 'contact', 
            width: isMobile ? 100 : 150,
            ellipsis: true,
        },
        { 
            title: '이메일', 
            dataIndex: 'email', 
            key: 'email', 
            width: isMobile ? 140 : 200,
            ellipsis: true,
        },
        { 
            title: '주소', 
            dataIndex: 'address', 
            key: 'address', 
            width: isMobile ? 150 : 250,
            ellipsis: true,
        },
        {
            title: '공급 품목',
            dataIndex: 'supplies',
            key: 'supplies',
            width: isMobile ? 120 : 200,
            render: (supplies: SupplierInventory[]) => {
                if (!supplies || supplies.length === 0) {
                    return '-';
                }
                const displayCount = isMobile ? 1 : 3;
                return (
                    <Flex gap="4px 0" wrap="wrap">
                        {supplies.slice(0, displayCount).map(s => (
                            <Tag key={s.id} style={{ fontSize: isMobile ? '11px' : '12px', marginBottom: '4px' }}>
                                {s.inventory.name}
                            </Tag>
                        ))}
                        {supplies.length > displayCount && (
                            <Tag style={{ fontSize: isMobile ? '11px' : '12px' }}>
                                +{supplies.length - displayCount}
                            </Tag>
                        )}
                    </Flex>
                );
            },
        },
        {
            title: '관리',
            key: 'action',
            fixed: isMobile ? ('right' as const) : undefined,
            width: isMobile ? 100 : 180,
            render: (_: any, record: SupplierItem) => (
                <Space size="small" direction={isMobile ? 'vertical' : 'horizontal'}>
                    <Button 
                        onClick={() => navigate(`/suppliers/${record.id}`)}
                        size={isMobile ? 'small' : 'middle'}
                        block={isMobile}
                    >
                        수정
                    </Button>
                    <Button 
                        danger 
                        onClick={() => handleDelete(record.id)}
                        size={isMobile ? 'small' : 'middle'}
                        block={isMobile}
                    >
                        삭제
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Flex 
                justify="space-between" 
                align="center" 
                wrap="wrap" 
                style={{ marginBottom: isMobile ? '16px' : '24px' }}
                vertical={isMobile}
            >
                <Title 
                    level={isMobile ? 4 : 3} 
                    style={{ 
                        margin: 0,
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: 700
                    }}
                >
                    공급업체 관리
                </Title>
                <Space 
                    direction={isMobile ? 'vertical' : 'horizontal'}
                    style={{ 
                        marginTop: isMobile ? '12px' : '8px',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    <Button 
                        icon={<RedoOutlined />} 
                        onClick={fetchSuppliers} 
                        loading={loading}
                        block={isMobile}
                    >
                        새로고침
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => navigate('/suppliers/new')}
                        block={isMobile}
                        size={isMobile ? 'large' : 'middle'}
                    >
                        새 공급업체 등록
                    </Button>
                </Space>
            </Flex>
            <Table 
                columns={columns} 
                dataSource={suppliers} 
                loading={loading} 
                scroll={{ x: 'max-content' }}
                size={isMobile ? 'small' : 'middle'}
                pagination={isMobile ? { pageSize: 10, showSizeChanger: false } : { pageSize: 20 }}
            />
        </>
    );
};

export default SupplierList;

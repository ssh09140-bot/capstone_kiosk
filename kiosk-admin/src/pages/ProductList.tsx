import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface Product {
    key: string;
    id: number;
    name: string;
    price: number;
    stock: number;
}

const ProductList: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            const dataWithKeys = response.data.map((item: any) => ({ ...item, key: item.id.toString() }));
            setProducts(dataWithKeys);
        } catch (error) {
            console.error("상품 목록 로딩 실패:", error);
            message.error('상품 목록을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDelete = async (id: number) => {
        if (window.confirm(`상품 ID ${id}번을 정말 삭제하시겠습니까?`)) {
            try {
                await api.delete(`/products/${id}`);
                message.success('상품이 삭제되었습니다.');
                fetchProducts();
            } catch (error) {
                message.error('상품 삭제에 실패했습니다.');
            }
        }
    };

    const columns = [
        { title: '상품명', dataIndex: 'name', key: 'name' },
        { title: '가격', dataIndex: 'price', key: 'price', render: (price: number) => `${price.toLocaleString()}원` },
        { title: '재고', dataIndex: 'stock', key: 'stock', render: (stock: number) => `${stock}개` },
        {
            title: '관리',
            key: 'action',
            render: (_: any, record: Product) => (
                <Space size="middle">
                    <Button onClick={() => navigate(`/products/${record.id}`)}>수정</Button>
                    <Button danger onClick={() => handleDelete(record.id)}>삭제</Button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Flex justify="space-between" align="center" style={{ marginBottom: '24px' }}>
                <Title level={3} style={{ margin: 0 }}>상품 목록</Title>
                <Space>
                    <Button icon={<RedoOutlined />} onClick={fetchProducts} loading={loading}>
                        새로고침
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
                        새 상품 등록
                    </Button>
                </Space>
            </Flex>
            <Table columns={columns} dataSource={products} loading={loading} />
        </>
    );
};

export default ProductList;
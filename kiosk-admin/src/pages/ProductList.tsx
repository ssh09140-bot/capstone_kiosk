import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Flex, message, Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PlusOutlined, RedoOutlined, EditOutlined, DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import './ProductList.css';

const { Title, Text } = Typography;

interface Product {
    key: string;
    id: number;
    name: string;
    price: number;
    availableStock: number;
}

const ProductList: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        { title: '재고', dataIndex: 'availableStock', key: 'availableStock', render: (stock: number) => (stock === 999999 ? '재고 미관리' : `${stock}개`) },
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

    // Mobile Card View
    const renderMobileCards = () => (
        <div className="product-cards-container">
            {products.map(product => (
                <Card
                    key={product.id}
                    className="product-card"
                    hoverable
                    onClick={() => navigate(`/products/${product.id}`)}
                >
                    <div className="product-card-header">
                        <div className="product-icon">
                            <ShoppingOutlined />
                        </div>
                        <div className="product-info">
                            <Text strong className="product-name">{product.name}</Text>
                            <Text className="product-price">{product.price.toLocaleString()}원</Text>
                        </div>
                    </div>
                    <div className="product-card-footer">
                        <Tag color={product.availableStock === 999999 ? 'default' : (product.availableStock > 10 ? 'success' : 'warning')}>
                            {product.availableStock === 999999 ? '재고 미관리' : `재고 ${product.availableStock}개`}
                        </Tag>
                        <Space size="small">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/products/${product.id}`);
                                }}
                            >
                                수정
                            </Button>
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(product.id);
                                }}
                            >
                                삭제
                            </Button>
                        </Space>
                    </div>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="product-list-container">
            <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: isMobile ? '16px' : '24px' }}>
                <Title level={3} style={{ margin: 0 }}>상품 목록</Title>
                {!isMobile && (
                    <Space style={{ marginTop: '8px' }}>
                        <Button icon={<RedoOutlined />} onClick={fetchProducts} loading={loading}>
                            새로고침
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
                            새 상품 등록
                        </Button>
                    </Space>
                )}
            </Flex>

            {isMobile ? (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text>로딩 중...</Text>
                        </div>
                    ) : (
                        renderMobileCards()
                    )}
                    {/* Floating Action Button */}
                    <Button
                        type="primary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        size="large"
                        className="mobile-fab"
                        onClick={() => navigate('/products/new')}
                    />
                </>
            ) : (
                <Table columns={columns} dataSource={products} loading={loading} scroll={{ x: 'max-content' }} />
            )}
        </div>
    );
};

export default ProductList;
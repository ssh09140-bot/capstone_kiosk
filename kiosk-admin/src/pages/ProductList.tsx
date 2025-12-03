import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Flex, message, Tag } from 'antd';
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
    imageUrl?: string;
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

    // Mobile Card View (Restored based on image)
    const renderMobileCards = () => (
        <div className="product-mobile-list">
            {products.map(product => (
                <div
                    key={product.id}
                    className="mobile-product-card"
                    onClick={() => navigate(`/products/${product.id}`)}
                >
                    <div className="mobile-card-header">
                        <div className="mobile-icon-wrapper">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                />
                            ) : (
                                <ShoppingOutlined />
                            )}
                        </div>
                        <div className="mobile-info">
                            <Text strong className="mobile-name">{product.name}</Text>
                            <Text className="mobile-price">{product.price.toLocaleString()}원</Text>
                        </div>
                    </div>

                    <div className="mobile-card-divider" />

                    <div className="mobile-card-footer">
                        <Tag
                            className="mobile-stock-tag"
                            color={product.availableStock === 999999 ? 'default' : (product.availableStock > 10 ? 'success' : 'warning')}
                        >
                            {product.availableStock === 999999 ? '재고 미관리' : `${product.availableStock}개`}
                        </Tag>
                        <div className="mobile-actions">
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
                        </div>
                    </div>
                </div>
            ))}
            {/* Floating Action Button */}
            <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                size="large"
                className="mobile-fab"
                onClick={() => navigate('/products/new')}
            />
        </div>
    );

    // Unified Grid View (Desktop)
    const renderProductGrid = () => (
        <div className="product-grid-container">
            {/* Add New Product Card */}
            <div
                className="product-card add-new-card"
                onClick={() => navigate('/products/new')}
            >
                <div className="add-new-content">
                    <div className="add-icon-wrapper">
                        <PlusOutlined />
                    </div>
                    <Text strong className="add-text">새 상품 등록</Text>
                </div>
            </div>

            {products.map(product => (
                <div
                    key={product.id}
                    className="product-card"
                    onClick={() => navigate(`/products/${product.id}`)}
                >
                    <div className="product-card-body">
                        <div className="product-icon-wrapper">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                                />
                            ) : (
                                <ShoppingOutlined />
                            )}
                        </div>
                        <div className="product-info-wrapper">
                            <Text className="product-name">{product.name}</Text>
                            <Text className="product-price">{product.price.toLocaleString()}원</Text>
                            <Tag
                                className="stock-tag"
                                color={product.availableStock === 999999 ? 'default' : (product.availableStock > 10 ? 'success' : 'warning')}
                            >
                                {product.availableStock === 999999 ? '재고 미관리' : `${product.availableStock}개 남음`}
                            </Tag>
                        </div>
                    </div>
                    <div className="product-card-actions">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/products/${product.id}`);
                            }}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(product.id);
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="product-list-container">
            <Flex justify="space-between" align="center" style={{ marginBottom: isMobile ? '16px' : '32px' }}>
                <div className="page-header">
                    <Title level={isMobile ? 3 : 2} style={{ margin: 0, fontWeight: 800 }}>상품 관리</Title>
                    {!isMobile && <Text type="secondary">매장의 모든 상품을 한눈에 관리하세요</Text>}
                </div>
                {!isMobile && (
                    <Button
                        icon={<RedoOutlined />}
                        onClick={fetchProducts}
                        loading={loading}
                        shape="circle"
                        size="large"
                        type="text"
                    />
                )}
            </Flex>

            {loading ? (
                <div className="loading-state">
                    <Text>상품 정보를 불러오는 중...</Text>
                </div>
            ) : (
                isMobile ? renderMobileCards() : renderProductGrid()
            )}
        </div>
    );
};

export default ProductList;
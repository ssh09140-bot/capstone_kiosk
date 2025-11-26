import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, message, Modal, Form, Input, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import api from '../api';
import './CategoryList.css';

const { Title, Text } = Typography;

interface Category {
    key: string;
    id: number;
    name: string;
}

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [form] = Form.useForm();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/categories');
            setCategories(response.data.map((cat: any) => ({ ...cat, key: cat.id.toString() })));
        } catch (error) {
            message.error('카테고리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingCategory(null);
        form.resetFields();
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingCategory) {
                await api.put(`/categories/${editingCategory.id}`, values);
                message.success('카테고리가 수정되었습니다.');
            } else {
                await api.post('/categories', values);
                message.success('새 카테고리가 추가되었습니다.');
            }
            handleCancel();
            fetchCategories();
        } catch (error) {
            message.error('작업에 실패했습니다.');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('정말로 이 카테고리를 삭제하시겠습니까?')) {
            try {
                await api.delete(`/categories/${id}`);
                message.success('카테고리가 삭제되었습니다.');
                fetchCategories();
            } catch (error: any) {
                message.error(error.response?.data?.message || '삭제에 실패했습니다.');
            }
        }
    };

    const showEditModal = (category: Category) => {
        setEditingCategory(category);
        form.setFieldsValue(category);
        setIsModalVisible(true);
    };

    // Mobile Card View (Existing)
    const renderMobileCards = () => (
        <div className="category-cards-container">
            {categories.map((category) => (
                <Card
                    key={category.id}
                    className="category-card"
                    hoverable
                    onClick={() => showEditModal(category)}
                >
                    <div className="category-card-content">
                        <div className="category-icon-wrapper">
                            <div className="category-icon">
                                <AppstoreOutlined />
                            </div>
                            <div className="category-number">#{category.id}</div>
                        </div>
                        <div className="category-info">
                            <Text strong className="category-name">{category.name}</Text>
                        </div>
                    </div>
                    <div className="category-card-footer">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                showEditModal(category);
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
                                handleDelete(category.id);
                            }}
                        >
                            삭제
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );

    // Desktop Grid View (New)
    const renderCategoryGrid = () => (
        <div className="category-grid-container">
            {/* Add New Category Card */}
            <div
                className="category-card-desktop add-new-card"
                onClick={() => {
                    setEditingCategory(null);
                    form.resetFields();
                    setIsModalVisible(true);
                }}
            >
                <div className="add-new-content">
                    <div className="add-icon-wrapper">
                        <PlusOutlined />
                    </div>
                    <Text strong className="add-text">새 카테고리 추가</Text>
                </div>
            </div>

            {categories.map(category => (
                <div
                    key={category.id}
                    className="category-card-desktop"
                    onClick={() => showEditModal(category)}
                >
                    <div className="category-card-body">
                        <div className="category-icon-wrapper-desktop">
                            <AppstoreOutlined />
                        </div>
                        <div className="category-info-wrapper">
                            <Text className="category-name-desktop">{category.name}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>ID: {category.id}</Text>
                        </div>
                    </div>
                    <div className="category-card-actions">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                showEditModal(category);
                            }}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(category.id);
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="category-list-container">
            <div style={{ marginBottom: isMobile ? 16 : 32 }}>
                <Title level={isMobile ? 3 : 2} style={{ margin: 0, fontWeight: 800 }}>카테고리 관리</Title>
                {!isMobile && <Text type="secondary">매장의 메뉴 카테고리를 관리하세요</Text>}
            </div>

            {isMobile ? (
                <>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Text>로딩 중...</Text>
                        </div>
                    ) : categories.length === 0 ? (
                        <Card style={{ textAlign: 'center', padding: '40px' }}>
                            <AppstoreOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                            <Text type="secondary">카테고리가 없습니다.</Text>
                        </Card>
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
                        onClick={() => {
                            setEditingCategory(null);
                            form.resetFields();
                            setIsModalVisible(true);
                        }}
                    />
                </>
            ) : (
                renderCategoryGrid()
            )}

            <Modal
                title={
                    <div className="modal-title-wrapper">
                        <AppstoreOutlined />
                        <span>{editingCategory ? "카테고리 수정" : "새 카테고리 추가"}</span>
                    </div>
                }
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                okText="저장"
                cancelText="취소"
                className="category-modal"
                width={500}
                centered
            >
                <Form form={form} layout="vertical" className="category-form">
                    <Form.Item
                        name="name"
                        label="카테고리 이름"
                        rules={[{ required: true, message: '카테고리 이름을 입력해주세요.' }]}
                    >
                        <Input placeholder="예: 음료, 디저트, 메인 메뉴" size="large" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CategoryList;
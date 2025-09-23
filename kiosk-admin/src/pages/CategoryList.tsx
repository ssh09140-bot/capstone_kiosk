// src/pages/CategoryList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input } from 'antd';
import api from '../api';

const { Title } = Typography;

interface Category {
    key: string;
    id: number;
    name: string;
}

const CategoryList: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

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

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            await api.post('/categories', values);
            message.success('새 카테고리가 추가되었습니다.');
            setIsModalVisible(false);
            form.resetFields();
            fetchCategories(); // 목록 새로고침
        } catch (error) {
            message.error('카테고리 추가에 실패했습니다.');
        }
    };

    const columns = [
        { title: '카테고리 ID', dataIndex: 'id', key: 'id' },
        { title: '카테고리 이름', dataIndex: 'name', key: 'name' },
        // TODO: 수정 및 삭제 기능 추가
    ];

    return (
        <>
            <Title level={3}>카테고리 관리</Title>
            <Button onClick={() => setIsModalVisible(true)} type="primary" style={{ marginBottom: 16 }}>
                새 카테고리 추가
            </Button>
            <Table columns={columns} dataSource={categories} loading={loading} />
            <Modal title="새 카테고리 추가" visible={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="카테고리 이름" rules={[{ required: true, message: '카테고리 이름을 입력해주세요.' }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default CategoryList;
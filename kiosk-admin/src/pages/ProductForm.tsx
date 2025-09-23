import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, Upload, Typography, message, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import type { UploadProps } from 'antd';

const { Title } = Typography;
const { Option } = Select;

// 카테고리 데이터의 타입을 정의합니다.
interface Category {
    id: number;
    name: string;
}

const ProductForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // URL에서 상품 id를 가져옴
    const [form] = Form.useForm();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]); // 카테고리 목록 상태
    const isEditMode = Boolean(id); // id가 있으면 수정 모드

    // 1. 카테고리 목록을 불러오는 기능
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/categories');
                setCategories(response.data);
            } catch (error) {
                message.error('카테고리 목록을 불러오는데 실패했습니다.');
            }
        };
        fetchCategories();
    }, []); // 페이지가 처음 열릴 때 한 번만 실행

    // 2. 수정 모드일 때, 기존 상품 정보를 불러오는 기능
    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const response = await api.get(`/products/detail/${id}`);
                    form.setFieldsValue(response.data);
                    setImageUrl(response.data.imageUrl);
                } catch (error) {
                    message.error("상품 정보를 불러오는데 실패했습니다.");
                }
            };
            fetchProduct();
        }
    }, [id, isEditMode, form]);

    // 3. 이미지 업로드 처리 기능
    const handleUpload: UploadProps['customRequest'] = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('image', file as Blob);
        try {
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImageUrl(response.data.imageUrl);
            message.success(`파일 업로드 성공.`);
            if (onSuccess) onSuccess(response.data);
        } catch (error) {
            message.error(`파일 업로드 실패.`);
            if (onError) onError(error as Error);
        }
    };

    // 4. '저장하기' 버튼 클릭 시 실행되는 최종 기능
    const onFinish = async (values: any) => {
        try {
            const productData = { ...values, imageUrl };
            if (isEditMode) {
                await api.put(`/products/${id}`, productData);
                message.success('상품이 성공적으로 수정되었습니다.');
            } else {
                await api.post('/products', productData);
                message.success('상품이 성공적으로 저장되었습니다.');
            }
            navigate('/products');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || '알 수 없는 오류';
            message.error(`저장 실패: ${errorMessage}`);
        }
    };

    return (
        <>
            <Title level={3}>{isEditMode ? '상품 수정' : '새 상품 등록'}</Title>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item label="상품명" name="name" rules={[{ required: true, message: '상품명을 입력해주세요.' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="상세설명" name="description">
                    <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item label="가격" name="price" rules={[{ required: true, message: '가격을 입력해주세요.' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="초기 재고" name="stock" rules={[{ required: true, message: '재고 수량을 입력해주세요.' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="카테고리" name="categoryId">
                    <Select placeholder="상품의 카테고리를 선택하세요 (선택 사항)" allowClear>
                        {categories.map(cat => (
                            <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item label="상품 사진">
                    <Upload customRequest={handleUpload} maxCount={1} showUploadList={true}>
                        <Button icon={<UploadOutlined />}>이미지 업로드</Button>
                    </Upload>
                    {imageUrl && <img src={`http://localhost:3000${imageUrl}`} alt="상품 이미지" style={{ width: '100px', marginTop: '10px', borderRadius: '4px' }} />}
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">저장하기</Button>
                </Form.Item>
            </Form>
        </>
    );
};

export default ProductForm;
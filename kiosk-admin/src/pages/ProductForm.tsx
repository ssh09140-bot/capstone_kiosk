import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, Upload, message, Select, Spin, Card, Divider, Switch } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import type { UploadProps } from 'antd';

const { Option } = Select;
const FormItem = Form.Item;

interface Category {
    id: number;
    name: string;
}
interface OptionGroup {
    id: number;
    name: string;
}

const ProductForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const isEditMode = Boolean(id);

    const autoOrderEnabled = Form.useWatch('autoOrderEnabled', form);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [catRes, optRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/option-groups'),
                ]);
                setCategories(catRes.data);
                setOptionGroups(optRes.data);
            } catch (error) {
                message.error('페이지 데이터를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            const fetchProduct = async () => {
                try {
                    const { data } = await api.get(`/products/${id}`);
                    const optionGroupIds = data.optionGroups?.map((g: any) => g.id) || [];
                    form.setFieldsValue({ ...data, optionGroupIds });
                    setImageUrl(data.imageUrl);
                } catch (error) {
                    message.error("상품 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, isEditMode, form]);

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

    if (loading) {
        return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
    }

    return (
        <Card title={isEditMode ? '상품 수정' : '새 상품 등록'} style={{ maxWidth: '600px', margin: 'auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <FormItem label="상품명" name="name" rules={[{ required: true, message: '상품명을 입력해주세요.' }]}>
                    <Input />
                </FormItem>
                <FormItem label="상세설명" name="description">
                    <Input.TextArea rows={4} />
                </FormItem>
                <FormItem label="가격" name="price" rules={[{ required: true, message: '가격을 입력해주세요.' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} addonAfter="원" />
                </FormItem>
                <FormItem label="재고" name="stock" rules={[{ required: true, message: '재고 수량을 입력해주세요.' }]}>
                    <InputNumber min={0} style={{ width: '100%' }} addonAfter="개" />
                </FormItem>
                <FormItem label="카테고리" name="categoryId">
                    <Select placeholder="카테고리를 선택하세요 (선택 사항)" allowClear>
                        {categories.map(cat => <Option key={cat.id} value={cat.id}>{cat.name}</Option>)}
                    </Select>
                </FormItem>
                <FormItem label="옵션 그룹 연결" name="optionGroupIds">
                    <Select mode="multiple" placeholder="이 상품에 연결할 옵션 그룹들을 선택하세요" allowClear>
                        {optionGroups.map(group => (
                            <Option key={group.id} value={group.id}>{group.name}</Option>
                        ))}
                    </Select>
                </FormItem>
                <FormItem label="상품 사진">
                    <Upload customRequest={handleUpload} maxCount={1} showUploadList={true}>
                        <Button icon={<UploadOutlined />}>이미지 업로드</Button>
                    </Upload>
                    {imageUrl && <img src={`https://capstone-kiosk.onrender.com${imageUrl}`} alt="상품 이미지" style={{ width: '100px', marginTop: '10px', borderRadius: '4px' }} />}
                </FormItem>

                <Divider>자동 발주 설정</Divider>

                <FormItem label="자동 발주 사용" name="autoOrderEnabled" valuePropName="checked">
                    <Switch />
                </FormItem>

                {autoOrderEnabled && (
                    <>
                        <FormItem label="발주 기준 재고" name="minStockThreshold" rules={[{ required: true, message: '자동 발주를 사용하려면 기준 재고를 입력해야 합니다.' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} addonAfter="개 이하일 때" />
                        </FormItem>
                        <FormItem label="자동 발주 수량" name="orderQuantity" rules={[{ required: true, message: '자동 발주를 사용하려면 발주 수량을 입력해야 합니다.' }]}>
                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="개를 주문" />
                        </FormItem>
                        <FormItem label="예상 배송 기간" name="estimatedDeliveryDays">
                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="일 소요" />
                        </FormItem>
                    </>
                )}

                <FormItem style={{ marginTop: '32px' }}>
                    <Button type="primary" htmlType="submit" block>저장하기</Button>
                </FormItem>
            </Form>
        </Card>
    );
};

export default ProductForm;
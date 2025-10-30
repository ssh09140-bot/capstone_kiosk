import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, Upload, message, Select, Spin, Card, Divider, Switch } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import type { UploadFile } from 'antd/lib/upload/interface';

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
    const [fileList, setFileList] = useState<UploadFile[]>([]); // New state for file list
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null); // Renamed imageUrl to productImageUrl
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
                    setProductImageUrl(data.imageUrl); // Use productImageUrl
                } catch (error) {
                    message.error("상품 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, isEditMode, form]);

    // handleUpload function removed

    const onFinish = async (values: any) => {
        try {
            const formData = new FormData();
            for (const key in values) {
                if (values[key] !== undefined && values[key] !== null) {
                    if (Array.isArray(values[key])) {
                        values[key].forEach((item: any) => formData.append(`${key}[]`, item));
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            }

            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            } else if (productImageUrl && isEditMode) {
                // If no new file is uploaded but there's an existing image in edit mode,
                // we send its URL to ensure it's not removed if the backend expects it.
                formData.append('imageUrl', productImageUrl);
            }


            if (isEditMode) {
                await api.put(`/products/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                message.success('상품이 성공적으로 수정되었습니다.');
            } else {
                await api.post('/products', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
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
                    <Upload
                        maxCount={1}
                        showUploadList={true}
                        beforeUpload={() => false} // Prevent default upload behavior
                        onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                        fileList={fileList}
                        listType="picture"
                    >
                        <Button icon={<UploadOutlined />}>이미지 업로드</Button>
                    </Upload>
                    {productImageUrl && fileList.length === 0 && ( // Display existing image if no new file selected
                        <img src={`https://capstone-kiosk.onrender.com${productImageUrl}`} alt="상품 이미지" style={{ width: '100px', marginTop: '10px', borderRadius: '4px' }} />
                    )}
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
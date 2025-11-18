import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, Upload, message, Select, Spin, Card, Divider, List } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api, { type Inventory, getInventory } from '../api';
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
interface Usage {
    inventoryId: number;
    inventoryName: string;
    usageAmount: number;
    usageUnit: string;
}

const ProductForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
    const [inventories, setInventories] = useState<Inventory[]>([]);
    const [usages, setUsages] = useState<Usage[]>([]);
    const [loading, setLoading] = useState(false);
    const isEditMode = Boolean(id);

    // State for recipe input
    const [selectedInventory, setSelectedInventory] = useState<number | undefined>(undefined);
    const [usageAmount, setUsageAmount] = useState<number | null>(null);
    const [usageUnit, setUsageUnit] = useState<string>('g');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [catRes, optRes, invRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/option-groups'),
                    getInventory(),
                ]);
                setCategories(catRes.data);
                setOptionGroups(optRes.data);
                setInventories(invRes);
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
                    setProductImageUrl(data.imageUrl);
                    if (data.inventoryUsages) {
                        const mappedUsages = data.inventoryUsages.map((u: any) => ({
                            inventoryId: u.inventory.id,
                            inventoryName: u.inventory.name,
                            usageAmount: u.usageAmount,
                            usageUnit: u.usageUnit || u.inventory.unit, // Fallback to inventory unit
                        }));
                        setUsages(mappedUsages);
                    }
                } catch (error) {
                    message.error("상품 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, isEditMode, form]);

    const handleAddUsage = () => {
        if (!selectedInventory || !usageAmount) {
            message.warning('재고 품목과 소모량을 입력해주세요.');
            return;
        }
        if (usages.some(u => u.inventoryId === selectedInventory)) {
            message.warning('이미 추가된 재고 품목입니다.');
            return;
        }
        const inventory = inventories.find(i => i.id === selectedInventory);
        if (inventory) {
            setUsages([...usages, { inventoryId: selectedInventory, inventoryName: inventory.name, usageAmount, usageUnit }]);
            setSelectedInventory(undefined);
            setUsageAmount(null);
            setUsageUnit('g');
        }
    };

    const handleRemoveUsage = (inventoryId: number) => {
        setUsages(usages.filter(u => u.inventoryId !== inventoryId));
    };

    const onFinish = async (values: any) => {
        try {
            const formData = new FormData();
            // Append all simple key-values
            for (const key in values) {
                if (values[key] !== undefined && values[key] !== null) {
                    if (Array.isArray(values[key])) {
                        values[key].forEach((item: any) => formData.append(`${key}[]`, item));
                    } else {
                        formData.append(key, values[key]);
                    }
                }
            }

            // Append recipe usages
            const usagesToSubmit = usages.map(({ inventoryId, usageAmount, usageUnit }) => ({ inventoryId, usageAmount, usageUnit }));
            formData.append('inventoryUsages', JSON.stringify(usagesToSubmit));

            // Handle image
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            } else if (productImageUrl && isEditMode) {
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
                        beforeUpload={() => false}
                        onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                        fileList={fileList}
                        listType="picture"
                    >
                        <Button icon={<UploadOutlined />}>이미지 업로드</Button>
                    </Upload>
                    {productImageUrl && fileList.length === 0 && (
                        <img src={`https://capstone-kiosk.onrender.com${productImageUrl}`} alt="상품 이미지" style={{ width: '100px', marginTop: '10px', borderRadius: '4px' }} />
                    )}
                </FormItem>

                <Divider>레시피 설정</Divider>
                <List
                    header={<div>이 상품에 사용되는 재료</div>}
                    bordered
                    dataSource={usages}
                    renderItem={(item) => (
                        <List.Item
                            actions={[<Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveUsage(item.inventoryId)} />]}
                        >
                            <List.Item.Meta
                                title={item.inventoryName}
                                description={`소모량: ${item.usageAmount}${item.usageUnit}`}
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: '등록된 재료 없음' }}
                />
                <div style={{ display: 'flex', marginTop: '16px', gap: '8px' }}>
                    <Select
                        showSearch
                        placeholder="재고 품목 선택"
                        style={{ flex: 2 }}
                        value={selectedInventory}
                        onChange={setSelectedInventory}
                        optionFilterProp="children"
                    >
                        {inventories.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
                    </Select>
                    <InputNumber
                        min={0}
                        placeholder="소모량"
                        style={{ flex: 1 }}
                        value={usageAmount}
                        onChange={(value) => setUsageAmount(value)}
                    />
                    <Input 
                        placeholder="단위 (g, ml)" 
                        style={{ flex: 1 }} 
                        value={usageUnit} 
                        onChange={(e) => setUsageUnit(e.target.value)} 
                    />
                    <Button type="primary" onClick={handleAddUsage}>추가</Button>
                </div>

                <FormItem style={{ marginTop: '32px' }}>
                    <Button type="primary" htmlType="submit" block>저장하기</Button>
                </FormItem>
            </Form>
        </Card>
    );
};

export default ProductForm;
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card, Spin, Select, InputNumber, Space, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getSupplier, createSupplier, updateSupplier, type SupplierDto, getInventory, type Inventory } from '../api';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Option } = Select;
const FormItem = Form.Item;

interface SupplierFormValues {
    name: string;
    contact?: string | null;
    email?: string | null;
    address?: string | null;
    supplies?: {
        inventoryId: number;
        price?: number | null;
        leadTimeDays?: number | null;
    }[];
}

const SupplierForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm<SupplierFormValues>();
    const [loading, setLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
    const isEditMode = Boolean(id);

    useEffect(() => {
        const fetchInventories = async () => {
            try {
                const items = await getInventory();
                setInventoryItems(items);
            } catch (error) {
                message.error("전체 재고 품목을 불러오는데 실패했습니다.");
            }
        };
        fetchInventories();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            const fetchItem = async () => {
                try {
                    const numericId = parseInt(id!, 10);
                    const item = await getSupplier(numericId);
                    // Transform supplies for the form
                    const formData = {
                        ...item,
                        supplies: item.supplies.map(s => ({
                            inventoryId: s.inventoryId,
                            price: s.price,
                            leadTimeDays: s.leadTimeDays,
                        })),
                    };
                    form.setFieldsValue(formData);
                } catch (error) {
                    message.error("공급업체 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchItem();
        }
    }, [id, isEditMode, form]);

    const onFinish = async (values: SupplierFormValues) => {
        setLoading(true);
        const dto: SupplierDto = {
            name: values.name,
            contact: values.contact ?? null,
            email: values.email ?? null,
            address: values.address ?? null,
            supplies: values.supplies?.map(s => ({
                inventoryId: s.inventoryId,
                price: s.price ? Number(s.price) : null,
                leadTimeDays: s.leadTimeDays ? Number(s.leadTimeDays) : null,
            })) || [],
        };

        try {
            if (isEditMode) {
                const numericId = parseInt(id!, 10);
                await updateSupplier(numericId, dto);
                message.success('공급업체 정보가 성공적으로 수정되었습니다.');
            } else {
                await createSupplier(dto);
                message.success('공급업체가 성공적으로 저장되었습니다.');
            }
            navigate('/suppliers');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || '알 수 없는 오류';
            message.error(`저장 실패: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
    }

    return (
        <Card title={isEditMode ? '공급업체 수정' : '새 공급업체 등록'} style={{ maxWidth: '800px', margin: 'auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
                <Row gutter={16}>
                    <Col span={12}>
                        <FormItem label="공급업체명" name="name" rules={[{ required: true, message: '공급업체명을 입력해주세요.' }]}>
                            <Input />
                        </FormItem>
                    </Col>
                    <Col span={12}>
                        <FormItem label="연락처" name="contact">
                            <Input />
                        </FormItem>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <FormItem label="이메일" name="email" rules={[{ type: 'email', message: '유효한 이메일 주소를 입력해주세요.' }]}>
                            <Input />
                        </FormItem>
                    </Col>
                    <Col span={12}>
                        <FormItem label="주소" name="address">
                            <Input />
                        </FormItem>
                    </Col>
                </Row>

                <Card title="공급 품목" type="inner" style={{ marginTop: 24 }}>
                    <Form.List name="supplies">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8, alignItems: 'baseline' }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'inventoryId']}
                                            rules={[{ required: true, message: '품목을 선택하세요' }]}
                                            style={{ minWidth: '200px' }}
                                        >
                                            <Select placeholder="품목 선택">
                                                {inventoryItems.map(item => (
                                                    <Option key={item.id} value={item.id}>{item.name} ({item.unit})</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'price']}
                                        >
                                            <InputNumber placeholder="단가 (원)" style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'leadTimeDays']}
                                        >
                                            <InputNumber placeholder="리드타임 (일)" min={0} style={{ width: '100%' }} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        공급 품목 추가
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Card>

                <FormItem style={{ marginTop: '32px' }}>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        저장하기
                    </Button>
                </FormItem>
            </Form>
        </Card>
    );
};

export default SupplierForm;

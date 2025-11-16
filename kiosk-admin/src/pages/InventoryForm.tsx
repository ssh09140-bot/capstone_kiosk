import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, message, Card, Spin, Switch, Divider } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getInventoryItem, createInventoryItem, updateInventoryItem, type CreateInventoryItemDto, type UpdateInventoryItemDto } from '../api';

const FormItem = Form.Item;

interface InventoryFormValues {
    name: string;
    quantity: number;
    unit: string;
    itemType: string; // Added new field
    threshold: number | null;
    autoOrderEnabled: boolean;
    minStockThreshold?: number | null;
    orderQuantity?: number | null;
    estimatedDeliveryDays?: number | null;
}

const InventoryForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm<InventoryFormValues>();
    const [loading, setLoading] = useState(false);
    const isEditMode = Boolean(id);

    const autoOrderEnabled = Form.useWatch('autoOrderEnabled', form);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            const fetchItem = async () => {
                try {
                    const numericId = parseInt(id!, 10);
                    const item = await getInventoryItem(numericId);
                    form.setFieldsValue({
                        ...item,
                        threshold: item.threshold ?? null,
                        minStockThreshold: item.minStockThreshold ?? undefined,
                        orderQuantity: item.orderQuantity ?? undefined,
                    });
                } catch (error) {
                    message.error("재고 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchItem();
        }
    }, [id, isEditMode, form]);

    const onFinish = async (values: InventoryFormValues) => {
        setLoading(true);
        try {
            const payload: CreateInventoryItemDto | UpdateInventoryItemDto = {
                ...values,
                threshold: values.threshold || null,
                minStockThreshold: values.minStockThreshold || null,
                orderQuantity: values.orderQuantity || null,
                estimatedDeliveryDays: values.estimatedDeliveryDays || null,
            };

            if (isEditMode) {
                const numericId = parseInt(id!, 10);
                await updateInventoryItem(numericId, payload);
                message.success('재고 품목이 성공적으로 수정되었습니다.');
            } else {
                await createInventoryItem(payload as CreateInventoryItemDto);
                message.success('재고 품목이 성공적으로 저장되었습니다.');
            }
            navigate('/inventory');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || '알 수 없는 오류';
            message.error(`저장 실패: ${errorMessage}`);
        }
        finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />;
    }

    return (
        <Card title={isEditMode ? '재고 품목 수정' : '새 재고 품목 등록'} style={{ maxWidth: '600px', margin: 'auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ quantity: 0, autoOrderEnabled: false }}>
                <FormItem label="품목명" name="name" rules={[{ required: true, message: '품목명을 입력해주세요.' }]}>
                    <Input />
                </FormItem>
                <FormItem label="수량" name="quantity" rules={[{ required: true, message: '수량을 입력해주세요.' }]}>
                    <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </FormItem>
                <FormItem label="단위" name="unit" rules={[{ required: true, message: '단위(예: kg, L, 개)를 입력해주세요.' }]}>
                    <Input placeholder="kg, L, 개 등" />
                </FormItem>
                <FormItem label="품목 유형" name="itemType" rules={[{ required: true, message: '품목 유형을 입력해주세요.' }]}>
                    <Input placeholder="예: 원두, 우유, 시럽, 컵" />
                </FormItem>
                <FormItem label="재고 임계값" name="threshold">
                    <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="이 수량 이하일 때 알림 (선택 사항)" />
                </FormItem>

                <Divider>자동 발주 설정</Divider>

                <FormItem label="자동 발주 사용" name="autoOrderEnabled" valuePropName="checked">
                    <Switch />
                </FormItem>

                {autoOrderEnabled && (
                    <>
                        <FormItem label="발주 기준 재고" name="minStockThreshold" rules={[{ required: true, message: '자동 발주를 사용하려면 기준 재고를 입력해야 합니다.' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} addonAfter={`이하일 때`} />
                        </FormItem>
                        <FormItem label="자동 발주 수량" name="orderQuantity" rules={[{ required: true, message: '자동 발주를 사용하려면 발주 수량을 입력해야 합니다.' }]}>
                            <InputNumber min={0.1} style={{ width: '100%' }} addonAfter="을(를) 주문" />
                        </FormItem>
                        <FormItem label="예상 배송 기간" name="estimatedDeliveryDays">
                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="일 소요" />
                        </FormItem>
                    </>
                )}

                <FormItem style={{ marginTop: '32px' }}>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        저장하기
                    </Button>
                </FormItem>
            </Form>
        </Card>
    );
};

export default InventoryForm;

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, InputNumber, message, Card, Spin, Switch, Divider, Space } from 'antd';
import { ArrowLeftOutlined, InboxOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getInventoryItem, createInventoryItem, updateInventoryItem, type CreateInventoryItemDto, type UpdateInventoryItemDto } from '../api';
import './InventoryForm.css';

const FormItem = Form.Item;

interface InventoryFormValues {
    name: string;
    quantity: number;
    unit: string;
    itemType: string;
    threshold: number | null;
    autoOrderEnabled: boolean;
    minStockThreshold?: number | null;
    orderQuantity?: number | null;
    estimatedDeliveryDays?: number | null;
    packAmount: number;
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
                        itemType: item.itemType,
                        threshold: item.threshold ?? null,
                        minStockThreshold: item.minStockThreshold ?? undefined,
                        orderQuantity: item.orderQuantity ?? undefined,
                        packAmount: item.packAmount || 1.0,
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
                packAmount: values.packAmount || 1.0,
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
        return (
            <div className="form-loading">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="inventory-form-container">
            <Card
                className="inventory-form-card"
                title={
                    <>
                        <InboxOutlined />
                        {isEditMode ? '재고 품목 수정' : '새 재고 품목 등록'}
                    </>
                }
                extra={
                    <Button
                        className="back-button"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/inventory')}
                    >
                        목록으로
                    </Button>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ quantity: 0, autoOrderEnabled: false, packAmount: 1.0 }}
                >
                    {/* Basic Information Section */}
                    <div className="form-section">
                        <div className="form-section-title">
                            <SettingOutlined />
                            기본 정보
                        </div>
                        <FormItem label="품목명" name="name" rules={[{ required: true, message: '품목명을 입력해주세요.' }]}>
                            <Input placeholder="예: 콜롬비아 원두" />
                        </FormItem>
                        <FormItem label="품목 유형" name="itemType" rules={[{ required: true, message: '품목 유형을 입력해주세요.' }]}>
                            <Input placeholder="예: 원두, 우유, 시럽, 컵" />
                        </FormItem>
                        <Space style={{ width: '100%' }} size="large">
                            <FormItem label="수량" name="quantity" rules={[{ required: true, message: '수량을 입력해주세요.' }]} style={{ flex: 0.7 }}>
                                <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="0" />
                            </FormItem>
                            <FormItem label="단위" name="unit" rules={[{ required: true, message: '단위를 입력해주세요.' }]} style={{ flex: 0.7 }}>
                                <Input placeholder="kg, L, 개" />
                            </FormItem>
                        </Space>
                        <FormItem label="재고 임계값 (알림 기준)" name="threshold">
                            <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="이 수량 이하일 때 알림 (선택 사항)" />
                        </FormItem>
                        <FormItem label="기본 발주 단위 (Pack Amount)" name="packAmount" rules={[{ required: true, message: '발주 단위를 입력해주세요.' }]}>
                            <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} placeholder="예: 1.0 (1kg 팩)" />
                        </FormItem>
                    </div>

                    {/* Auto Order Section */}
                    <Divider className="auto-order-divider">
                        <ThunderboltOutlined />
                        자동 발주 설정
                    </Divider>

                    <FormItem label="자동 발주 사용" name="autoOrderEnabled" valuePropName="checked">
                        <Switch />
                    </FormItem>

                    {autoOrderEnabled && (
                        <div className="auto-order-section">
                            <FormItem label="발주 기준 재고" name="minStockThreshold" rules={[{ required: true, message: '자동 발주를 사용하려면 기준 재고를 입력해야 합니다.' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} addonAfter="이하일 때" placeholder="예: 10" />
                            </FormItem>
                            <FormItem label="자동 발주 수량" name="orderQuantity" rules={[{ required: true, message: '자동 발주를 사용하려면 발주 수량을 입력해야 합니다.' }]}>
                                <InputNumber min={0.1} style={{ width: '100%' }} addonAfter="을(를) 주문" placeholder="예: 50" />
                            </FormItem>
                            <FormItem label="예상 배송 기간" name="estimatedDeliveryDays">
                                <InputNumber min={1} style={{ width: '100%' }} addonAfter="일 소요" placeholder="예: 3" />
                            </FormItem>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <FormItem>
                        <Space className="form-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                className="cancel-button"
                                onClick={() => navigate('/inventory')}
                                size="large"
                            >
                                취소
                            </Button>
                            <Button
                                className="save-button"
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                size="large"
                            >
                                {isEditMode ? '수정하기' : '저장하기'}
                            </Button>
                        </Space>
                    </FormItem>
                </Form>
            </Card>
        </div>
    );
};

export default InventoryForm;

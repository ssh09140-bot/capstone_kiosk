import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getSupplier, createSupplier, updateSupplier, SupplierDto } from '../api';

const FormItem = Form.Item;

const SupplierForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const isEditMode = Boolean(id);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            const fetchItem = async () => {
                try {
                    const numericId = parseInt(id!, 10);
                    const item = await getSupplier(numericId);
                    form.setFieldsValue(item);
                } catch (error) {
                    message.error("공급업체 정보를 불러오는데 실패했습니다.");
                } finally {
                    setLoading(false);
                }
            };
            fetchItem();
        }
    }, [id, isEditMode, form]);

    const onFinish = async (values: SupplierDto) => {
        setLoading(true);
        try {
            if (isEditMode) {
                const numericId = parseInt(id!, 10);
                await updateSupplier(numericId, values);
                message.success('공급업체 정보가 성공적으로 수정되었습니다.');
            } else {
                await createSupplier(values);
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
        <Card title={isEditMode ? '공급업체 수정' : '새 공급업체 등록'} style={{ maxWidth: '600px', margin: 'auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <FormItem label="공급업체명" name="name" rules={[{ required: true, message: '공급업체명을 입력해주세요.' }]}>
                    <Input />
                </FormItem>
                <FormItem label="연락처" name="contact">
                    <Input />
                </FormItem>
                <FormItem label="이메일" name="email" rules={[{ type: 'email', message: '유효한 이메일 주소를 입력해주세요.' }]}>
                    <Input />
                </FormItem>
                <FormItem label="주소" name="address">
                    <Input />
                </FormItem>
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

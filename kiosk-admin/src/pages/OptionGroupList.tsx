import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input, InputNumber, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';

const { Title } = Typography;

// 옵션과 옵션 그룹의 타입을 명확하게 정의합니다.
interface Option {
    id: number;
    name: string;
    price: number;
}
interface OptionGroup {
    key: string;
    id: number;
    name: string;
    options: Option[];
}

const OptionGroupList: React.FC = () => {
    const [groups, setGroups] = useState<OptionGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // 서버에서 옵션 그룹 목록을 불러오는 함수
    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/option-groups');
            setGroups(response.data.map((g: any) => ({ ...g, key: g.id.toString() })));
        } catch (error) {
            message.error('옵션 그룹을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    // 페이지가 처음 열릴 때 옵션 그룹 목록을 불러옵니다.
    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // '새 옵션 그룹 추가' 모달의 저장 버튼을 눌렀을 때 실행되는 함수
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            // 옵션 목록이 비어있지 않은지 추가로 확인
            if (!values.options || values.options.length === 0) {
                message.error('하나 이상의 옵션을 추가해야 합니다.');
                return;
            }
            await api.post('/option-groups', values);
            message.success('새 옵션 그룹이 추가되었습니다.');
            setIsModalVisible(false);
            form.resetFields();
            fetchGroups(); // 목록 자동 새로고침
        } catch (error) {
            message.error('옵션 그룹 추가에 실패했습니다.');
        }
    };

    // 테이블 컬럼(열) 구조 정의
    const columns = [
        { title: '그룹 이름', dataIndex: 'name', key: 'name' },
        {
            title: '옵션 목록',
            dataIndex: 'options',
            key: 'options',
            render: (options: Option[]) => (
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {options.map(opt => (
                        <li key={opt.id}>{opt.name} (+{opt.price.toLocaleString()}원)</li>
                    ))}
                </ul>
            ),
        },
        // TODO: 나중에 수정 및 삭제 기능을 여기에 추가할 수 있습니다.
    ];

    return (
        <>
            <Title level={3}>옵션 그룹 관리</Title>
            <Button onClick={() => setIsModalVisible(true)} type="primary" style={{ marginBottom: 16 }}>
                새 옵션 그룹 추가
            </Button>
            <Table columns={columns} dataSource={groups} loading={loading} />
            <Modal title="새 옵션 그룹" open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)} width={600} okText="저장" cancelText="취소">
                <Form form={form} layout="vertical" initialValues={{ options: [{ name: '', price: 0 }]}}>
                    <Form.Item name="name" label="옵션 그룹 이름 (예: 사이즈)" rules={[{ required: true, message: '그룹 이름을 입력해주세요.' }]}>
                        <Input />
                    </Form.Item>
                    <Title level={5}>옵션 목록</Title>
                    <Form.List name="options">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: '옵션 이름을 입력해주세요.' }]}>
                                            <Input placeholder="옵션 이름 (예: L 사이즈)" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'price']} rules={[{ required: true, message: '추가 가격을 입력해주세요.' }]}>
                                            <InputNumber placeholder="추가 가격 (예: 500)" style={{ width: '100%' }} />
                                        </Form.Item>
                                        {fields.length > 1 ? <DeleteOutlined onClick={() => remove(name)} /> : null}
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        옵션 추가
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </>
    );
};

export default OptionGroupList;
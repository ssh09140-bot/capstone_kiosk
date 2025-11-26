import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Typography, message, Modal, Form, Input, InputNumber, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../api';
import './OptionGroupList.css'; // Import the new CSS file

const { Title, Text } = Typography;

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
    const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
    const [form] = Form.useForm();

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

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingGroup(null);
        form.resetFields();
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingGroup) {
                await api.put(`/option-groups/${editingGroup.id}`, values);
                message.success('옵션 그룹이 수정되었습니다.');
            } else {
                if (!values.options || values.options.length === 0) {
                    message.error('하나 이상의 옵션을 추가해야 합니다.');
                    return;
                }
                await api.post('/option-groups', values);
                message.success('새 옵션 그룹이 추가되었습니다.');
            }
            handleCancel();
            fetchGroups();
        } catch (error) {
            message.error('작업에 실패했습니다.');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(`정말로 이 옵션 그룹을 삭제하시겠습니까?`)) {
            try {
                await api.delete(`/option-groups/${id}`);
                message.success('옵션 그룹이 삭제되었습니다.');
                fetchGroups();
            } catch (error: any) {
                message.error(error.response?.data?.message || '삭제에 실패했습니다.');
            }
        }
    };
    
    const showEditModal = (group: OptionGroup) => {
        setEditingGroup(group);
        form.setFieldsValue(group);
        setIsModalVisible(true);
    };

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
        {
            title: '관리',
            key: 'action',
            render: (_: any, record: OptionGroup) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} onClick={() => showEditModal(record)}>수정</Button>
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>삭제</Button>
                </Space>
            )
        }
    ];

    return (
        <>
            <Title level={3}>옵션 그룹 관리</Title>
            <Button onClick={() => { setEditingGroup(null); form.resetFields(); setIsModalVisible(true); }} type="primary" style={{ marginBottom: 16 }}>
                새 옵션 그룹 추가
            </Button>
            <Table columns={columns} dataSource={groups} loading={loading} scroll={{ x: 'max-content' }} />
            <Modal
                title={
                    <div className="modal-title-wrapper">
                        <SettingOutlined />
                        <span>{editingGroup ? "옵션 그룹 수정" : "새 옵션 그룹"}</span>
                    </div>
                }
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                okText="저장"
                cancelText="취소"
                className="option-group-modal" // Apply modal class
                width={600} // Adjust width as needed
                centered
            >
                <Form form={form} layout="vertical" initialValues={editingGroup ? undefined : { options: [{ name: '', price: 0 }]}} className="option-group-form">
                    <div className="form-section">
                        <div className="form-section-title">
                            <SettingOutlined />
                            기본 정보
                        </div>
                        <Form.Item name="name" label="옵션 그룹 이름 (예: 사이즈)" rules={[{ required: true, message: '그룹 이름을 입력해주세요.' }]}>
                            <Input size="large" />
                        </Form.Item>
                    </div>

                    {!editingGroup && ( // Only show option list for new groups
                        <div className="form-section" style={{ marginTop: '24px' }}>
                            <div className="form-section-title">
                                <PlusOutlined />
                                옵션 목록
                            </div>
                            <Form.List name="options">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'name']}
                                                    rules={[{ required: true, message: '옵션 이름을 입력해주세요.' }]}
                                                    style={{ flex: 1 }}
                                                >
                                                    <Input placeholder="옵션 이름 (예: L 사이즈)" size="large" />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'price']}
                                                    rules={[{ required: true, message: '추가 가격을 입력해주세요.' }]}
                                                    style={{ flex: 1 }}
                                                >
                                                    <InputNumber placeholder="추가 가격 (예: 500)" style={{ width: '100%' }} size="large" />
                                                </Form.Item>
                                                {fields.length > 1 ? <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} /> : null}
                                            </Space>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="large">
                                                옵션 추가
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </div>
                    )}
                </Form>
            </Modal>
        </>
    );
};

export default OptionGroupList;
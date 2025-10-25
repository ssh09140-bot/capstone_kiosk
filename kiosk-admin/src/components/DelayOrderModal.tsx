import React from 'react';
import { Modal, Form, Select, Button } from 'antd';

interface DelayOrderModalProps {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: { delayHours: number }) => void;
}

const DelayOrderModal: React.FC<DelayOrderModalProps> = ({ visible, onCancel, onFinish }) => {
  const [form] = Form.useForm();

  const handleFinish = (values: { delayHours: string }) => {
    onFinish({ delayHours: parseInt(values.delayHours, 10) });
    form.resetFields();
  };

  return (
    <Modal
      open={visible}
      title="배송 지연 알림 설정"
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>취소</Button>,
        <Button key="submit" type="primary" form="delayOrderForm" htmlType="submit">설정</Button>,
      ]}
    >
      <Form id="delayOrderForm" form={form} onFinish={handleFinish} initialValues={{ delayHours: '3' }}>
        <Form.Item 
          name="delayHours" 
          label="다음 알림 시간"
          rules={[{ required: true, message: '시간을 선택해주세요.' }]}
        >
          <Select>
            <Select.Option value="1">1시간 뒤</Select.Option>
            <Select.Option value="3">3시간 뒤</Select.Option>
            <Select.Option value="24">1일 뒤</Select.Option>
            <Select.Option value="72">3일 뒤</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DelayOrderModal;
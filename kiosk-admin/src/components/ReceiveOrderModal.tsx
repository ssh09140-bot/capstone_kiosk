import React from 'react';
import { Modal, Form, InputNumber, Button, Typography, Space } from 'antd';
import type { PurchaseOrder, PurchaseOrderItem } from '../pages/PurchaseOrderList'; // Assuming the interface is exported from here

const { Text } = Typography;

interface ReceiveOrderModalProps {
  visible: boolean;
  order: PurchaseOrder | null;
  onCancel: () => void;
  onFinish: (values: any) => void;
}

const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({ visible, order, onCancel, onFinish }) => {
  const [form] = Form.useForm();

  if (!order) return null;

  const handleFinish = (values: any) => {
    const items = Object.keys(values).map(key => ({
      purchaseOrderItemId: parseInt(key.split('_')[1]),
      defectiveQuantity: values[key] || 0,
    }));
    onFinish({ items });
    form.resetFields();
  };

  return (
    <Modal
      open={visible}
      title={`발주 #${order.id} 입고 처리`}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>취소</Button>,
        <Button key="submit" type="primary" form="receiveOrderForm" htmlType="submit">재고에 반영</Button>,
      ]}
    >
      <Form id="receiveOrderForm" form={form} onFinish={handleFinish} layout="vertical">
        <p>각 상품별로 불량(폐기) 수량을 입력해주세요. 입력하지 않으면 0개로 처리됩니다.</p>
        {order.purchaseOrderItems.map((item: PurchaseOrderItem) => (
          <Form.Item key={item.id} label={`${item.product.name} (주문 수량: ${item.quantity}개)`}>
            <Space>
              <Form.Item
                name={`item_${item.id}`}
                noStyle
              >
                <InputNumber min={0} max={item.quantity} placeholder="불량 수량" />
              </Form.Item>
              <Text>개</Text>
            </Space>
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export default ReceiveOrderModal;

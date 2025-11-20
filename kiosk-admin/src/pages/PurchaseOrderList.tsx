import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Typography, Tag, message, Flex, Card } from 'antd';
import { RedoOutlined, ShoppingCartOutlined, CheckOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import api from '../api';
import ReceiveOrderModal from '../components/ReceiveOrderModal';
import DelayOrderModal from '../components/DelayOrderModal';
import './PurchaseOrderList.css';

const { Title, Text } = Typography;

export interface PurchaseOrderItem {
  id: number;
  product: { name: string } | null;
  inventory: { name: string } | null;
  quantity: number;
}

export interface PurchaseOrder {
  key: string;
  id: number;
  createdAt: string;
  status: 'PENDING_CONFIRMATION' | 'ORDERED' | 'DELIVERED' | 'CANCELLED';
  supplier: { name: string } | null;
  purchaseOrderItems: PurchaseOrderItem[];
}

const statusMap: { [key in PurchaseOrder['status']]: { color: string; text: string } } = {
  PENDING_CONFIRMATION: { color: 'orange', text: '확인 대기중' },
  ORDERED: { color: 'blue', text: '주문 완료' },
  DELIVERED: { color: 'green', text: '배송 완료' },
  CANCELLED: { color: 'default', text: '취소됨' },
};

const PurchaseOrderList: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [isDelayModalVisible, setIsDelayModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/purchase-orders');
      const dataWithKeys = response.data.map((item: any) => ({ ...item, key: item.id.toString() }));
      setPurchaseOrders(dataWithKeys);
    } catch (error) {
      console.error("발주 목록 로딩 실패:", error);
      message.error('발주 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleConfirm = async (id: number) => {
    try {
      await api.post(`/purchase-orders/${id}/confirm`);
      message.success('발주가 확정되었습니다.');
      fetchPurchaseOrders();
    } catch (error) {
      message.error('발주 확정에 실패했습니다.');
    }
  };

  const handleReceive = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsReceiveModalVisible(true);
  };

  const handleDelay = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDelayModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsReceiveModalVisible(false);
    setIsDelayModalVisible(false);
    setSelectedOrder(null);
  };

  const handleReceiveModalFinish = async (values: { items: { purchaseOrderItemId: number; defectiveQuantity: number }[] }) => {
    if (!selectedOrder) return;
    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/receive`, values);
      message.success('재고가 성공적으로 업데이트되었습니다.');
      handleModalCancel();
      fetchPurchaseOrders();
    } catch (error) {
      message.error('재고 업데이트에 실패했습니다.');
    }
  };

  const handleDelayModalFinish = async (values: { delayHours: number }) => {
    if (!selectedOrder) return;
    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/delay`, values);
      message.success(`다음 알림이 ${values.delayHours}시간 뒤로 설정되었습니다.`);
      handleModalCancel();
    } catch (error) {
      message.error('알림 지연 설정에 실패했습니다.');
    }
  };

  const columns = [
    { title: '발주 ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '공급처',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (supplier: { name: string } | null) => supplier?.name || '-',
    },
    {
      title: '발주 항목',
      dataIndex: 'purchaseOrderItems',
      key: 'items',
      render: (items: PurchaseOrderItem[]) => (
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          {items.map(item => {
            const itemName = item.product?.name || item.inventory?.name || '알 수 없는 품목';
            return <li key={item.id}>{`${itemName} (${item.quantity}개)`}</li>
          })}
        </ul>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: PurchaseOrder['status']) => (
        <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('ko-KR')
    },
    {
      title: '관리',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: any, record: PurchaseOrder) => (
        <Space size="middle">
          {record.status === 'PENDING_CONFIRMATION' && (
            <Button type="primary" onClick={() => handleConfirm(record.id)}>확정</Button>
          )}
          {record.status === 'ORDERED' && (
            <>
              <Button onClick={() => handleReceive(record)}>배송 받음</Button>
              <Button onClick={() => handleDelay(record)}>지연</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Mobile Card View
  const renderMobileCards = () => (
    <div className="purchase-cards-container">
      {purchaseOrders.map(order => (
        <Card
          key={order.id}
          className="purchase-card"
        >
          <div className="purchase-card-header">
            <div className="purchase-icon">
              <ShoppingCartOutlined />
            </div>
            <div className="purchase-info">
              <Text strong className="purchase-id">발주 #{order.id}</Text>
              <Text type="secondary" className="purchase-supplier">
                {order.supplier?.name || '공급처 없음'}
              </Text>
            </div>
            <Tag color={statusMap[order.status].color}>
              {statusMap[order.status].text}
            </Tag>
          </div>

          <div className="purchase-card-body">
            <div className="purchase-date">
              <CalendarOutlined style={{ marginRight: 6, fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                {new Date(order.createdAt).toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </div>

            <div className="purchase-items">
              <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>발주 항목:</Text>
              {order.purchaseOrderItems.map(item => {
                const itemName = item.product?.name || item.inventory?.name || '알 수 없는 품목';
                return (
                  <div key={item.id} className="purchase-item">
                    <Text>{itemName}</Text>
                    <Tag color="blue">{item.quantity}개</Tag>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="purchase-card-footer">
            {order.status === 'PENDING_CONFIRMATION' && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleConfirm(order.id)}
                block
              >
                발주 확정
              </Button>
            )}
            {order.status === 'ORDERED' && (
              <Space style={{ width: '100%' }} size="small">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleReceive(order)}
                  style={{ flex: 1 }}
                >
                  배송 받음
                </Button>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => handleDelay(order)}
                  style={{ flex: 1 }}
                >
                  지연
                </Button>
              </Space>
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="purchase-order-container">
      <Flex justify="space-between" align="center" style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Title level={3} style={{ margin: 0 }}>자동 발주 관리</Title>
        <Button icon={<RedoOutlined />} onClick={fetchPurchaseOrders} loading={loading}>
          {isMobile ? '' : '새로고침'}
        </Button>
      </Flex>

      {isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text>로딩 중...</Text>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px' }}>
            <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Text type="secondary">발주 내역이 없습니다.</Text>
          </Card>
        ) : (
          renderMobileCards()
        )
      ) : (
        <Table columns={columns} dataSource={purchaseOrders} loading={loading} scroll={{ x: 'max-content' }} />
      )}

      <ReceiveOrderModal
        visible={isReceiveModalVisible}
        order={selectedOrder}
        onCancel={handleModalCancel}
        onFinish={handleReceiveModalFinish}
      />
      <DelayOrderModal
        visible={isDelayModalVisible}
        onCancel={handleModalCancel}
        onFinish={handleDelayModalFinish}
      />
    </div>
  );
};

export default PurchaseOrderList;
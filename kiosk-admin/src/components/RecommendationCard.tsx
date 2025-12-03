import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Spin, List, Button, Flex, message, InputNumber, Popconfirm, Modal, Checkbox } from 'antd';
import { BulbOutlined, DeleteOutlined, UpOutlined, DownOutlined, CheckSquareOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getRecommendations, createPurchaseOrderFromRecommendation } from '../api';
import type { Recommendation, RecommendationResponse } from '../api';


const { Text, Paragraph } = Typography;

const RecommendationCard: React.FC = () => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isBulkOrdering, setIsBulkOrdering] = useState(false);


  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getRecommendations();
      setData(response);
      setRecommendations(response.recommendations);
      setSelectedItems(new Set()); // Reset selection on fetch
    } catch (error) {
      message.error('AI 발주 추천을 불러오는 데 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleCreateOrder = async (item: Recommendation) => {
    setOrderingId(item.inventoryId);
    try {
      await createPurchaseOrderFromRecommendation({
        inventoryId: item.inventoryId,
        supplierId: item.supplierId,
        quantity: item.recommendedOrderAmount,
      });
      message.success(`'${item.inventoryName}' 발주가 생성되었습니다.`);

      // 발주 성공 시 목록 및 선택에서 제거
      setRecommendations(prev => prev.filter(r => r.inventoryId !== item.inventoryId));
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(item.inventoryId);
        return next;
      });

      // 만약 모든 추천을 처리했다면 다시 fetch하거나 빈 상태 유지
      if (recommendations.length <= 1) {
        fetchRecommendations();
      }

    } catch (error) {
      message.error('발주 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setOrderingId(null);
    }
  };

  const handleDelete = (inventoryId: number) => {
    setRecommendations(prev => prev.filter(item => item.inventoryId !== inventoryId));
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(inventoryId);
      return next;
    });
    message.info('추천 항목이 삭제되었습니다.');
  };

  const handleQuantityChange = (inventoryId: number, newPackCount: number | null) => {
    if (newPackCount === null || newPackCount <= 0) return;

    setRecommendations(prev => prev.map(item =>
      item.inventoryId === inventoryId
        ? {
          ...item,
          recommendedPackCount: newPackCount,
          recommendedOrderAmount: newPackCount * item.packAmount
        }
        : item
    ));
  };

  const toggleSelection = (inventoryId: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(inventoryId)) {
        next.delete(inventoryId);
      } else {
        next.add(inventoryId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === recommendations.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(recommendations.map(r => r.inventoryId)));
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);

  const showConfirmModal = (item: Recommendation) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (selectedItem) {
      setIsModalOpen(false);
      await handleCreateOrder(selectedItem);
    }
  };

  const handleCancelOrder = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const showBulkConfirmModal = () => {
    if (selectedItems.size === 0) return;
    setIsBulkModalOpen(true);
  };

  const handleConfirmBulkOrder = async () => {
    setIsBulkModalOpen(false);
    await processBulkOrder();
  };

  const handleCancelBulkOrder = () => {
    setIsBulkModalOpen(false);
  };

  const processBulkOrder = async () => {
    setIsBulkOrdering(true);
    const itemsToOrder = recommendations.filter(r => selectedItems.has(r.inventoryId));
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToOrder) {
      try {
        await createPurchaseOrderFromRecommendation({
          inventoryId: item.inventoryId,
          supplierId: item.supplierId,
          quantity: item.recommendedOrderAmount,
        });
        successCount++;
        // Remove from list locally
        setRecommendations(prev => prev.filter(r => r.inventoryId !== item.inventoryId));
      } catch (error) {
        console.error(`Failed to order ${item.inventoryName}`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      message.success(`${successCount}건의 발주가 생성되었습니다.`);
    }
    if (failCount > 0) {
      message.error(`${failCount}건의 발주 생성에 실패했습니다.`);
    }

    setSelectedItems(new Set());
    setIsBulkOrdering(false);

    if (recommendations.length - successCount <= 0) {
      fetchRecommendations();
    }
  };

  // Helper to render predicted usage text
  const renderPredictedUsage = (item: Recommendation) => {
    if (item.predictedUsage <= 0) return '데이터 부족';
    const days = item.currentStock / item.predictedUsage;
    if (days < 1) return '오늘 소진 예정';
    return `${Math.round(days)}일 후 소진`;
  };

  // Helper to render delivery info
  const renderDeliveryInfo = (leadTimeDays: number) => {
    const deliveryDate = dayjs().add(leadTimeDays, 'day').format('M월 D일');
    return `예상 배송일: ${deliveryDate} (${leadTimeDays}일 소요)`;
  };

  if (loading && !data) {
    return (
      <Card style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Spin />
        <Text style={{ marginLeft: 16 }}>AI가 발주 추천을 생성하고 있습니다...</Text>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const displayedRecommendations = showAll ? recommendations : recommendations.slice(0, 2);
  const hasMore = recommendations.length > 2;

  return (
    <>
      <Card
        title={
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Flex align="center">
              <BulbOutlined style={{ marginRight: 8 }} /> AI 발주 추천
            </Flex>
            {recommendations.length > 0 && (
              <Flex gap="small">
                <Checkbox
                  checked={selectedItems.size > 0 && selectedItems.size === recommendations.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < recommendations.length}
                  onChange={toggleSelectAll}
                >
                  전체 선택
                </Checkbox>
                <Button
                  type="primary"
                  size="small"
                  disabled={selectedItems.size === 0}
                  loading={isBulkOrdering}
                  onClick={showBulkConfirmModal}
                  icon={<CheckSquareOutlined />}
                >
                  {selectedItems.size}건 일괄 발주
                </Button>
              </Flex>
            )}
          </Flex>
        }
        style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        extra={loading && <Spin size="small" />}
      >
        <Paragraph style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000' }}>{data.message}</Paragraph>
        {recommendations.length > 0 ? (
          <>
            <List
              itemLayout="vertical"
              dataSource={displayedRecommendations}
              renderItem={item => (
                <List.Item
                  key={item.inventoryId}
                  actions={[
                    <Button
                      type="primary"
                      onClick={() => showConfirmModal(item)}
                      loading={orderingId === item.inventoryId}
                    >
                      이대로 발주 생성
                    </Button>,
                    <Popconfirm
                      title="추천 항목 삭제"
                      description="이 추천 항목을 목록에서 삭제하시겠습니까?"
                      onConfirm={() => handleDelete(item.inventoryId)}
                      okText="삭제"
                      cancelText="취소"
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        삭제
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={selectedItems.has(item.inventoryId)}
                        onChange={() => toggleSelection(item.inventoryId)}
                        style={{ marginTop: 8 }}
                      />
                    }
                    title={
                      <Flex align="center" gap="small">
                        <Text strong style={{ fontSize: 16 }}>{item.inventoryName}</Text>
                        <Text type="secondary">추천 수량:</Text>
                        <InputNumber
                          min={1}
                          value={item.recommendedPackCount}
                          onChange={(val) => handleQuantityChange(item.inventoryId, val)}
                          addonAfter="팩"
                          style={{ width: 100 }}
                        />
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          (총 {item.recommendedOrderAmount}{item.unit})
                        </Text>
                      </Flex>
                    }
                    description={<Text type="secondary">{item.reason}</Text>}
                  />
                  <Flex gap="large" style={{ marginTop: 16, flexWrap: 'wrap', paddingLeft: 32 }}>
                    <div>
                      <Text strong>현재 재고: </Text>
                      <Text>{item.currentStock}{item.unit}</Text>
                    </div>
                    <div>
                      <Text strong>예상 소진일: </Text>
                      <Text>
                        {(() => {
                          if (item.predictedUsage <= 0) return '데이터 부족';
                          const days = item.currentStock / item.predictedUsage;
                          if (days < 1) return <Text type="danger" strong>오늘 소진 예정</Text>;
                          return `${Math.round(days)}일 후 소진`;
                        })()}
                      </Text>
                    </div>
                    <div>
                      <Text strong>최적 공급처: </Text>
                      <Text>{item.supplierName} ({renderDeliveryInfo(item.leadTimeDays)})</Text>
                    </div>
                  </Flex>
                </List.Item>
              )}
            />
            {hasMore && (
              <Button
                type="dashed"
                block
                style={{ marginTop: 16 }}
                onClick={() => setShowAll(!showAll)}
                icon={showAll ? <UpOutlined /> : <DownOutlined />}
              >
                {showAll ? '접기' : `추천 항목 ${recommendations.length - 2}개 더 보기`}
              </Button>
            )}
          </>
        ) : (
          <Flex vertical align="center" justify="center" style={{ padding: '20px 0' }}>
            <Text type="secondary">오늘은 추가 발주가 필요하지 않습니다.</Text>
            <Button type="link" onClick={fetchRecommendations}>다시 확인하기</Button>
          </Flex>
        )}
      </Card>

      {/* 발주 확인 모달 */}
      {selectedItem && (
        <Modal
          title="발주 확인"
          open={isModalOpen}
          onOk={handleConfirmOrder}
          onCancel={handleCancelOrder}
          okText="확정"
          cancelText="취소"
        >
          <Paragraph>이대로 발주를 하시겠습니까?</Paragraph>
          <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
            <p style={{ marginBottom: '8px' }}>
              <Text strong>현재 재고: </Text>
              <Text>{selectedItem.currentStock}{selectedItem.unit}</Text>
            </p>
            <p style={{ marginBottom: '8px' }}>
              <Text strong>예상 소진일: </Text>
              <Text>{renderPredictedUsage(selectedItem)}</Text>
            </p>
            <p style={{ marginBottom: 0 }}>
              <Text strong>최적 공급처: </Text>
              <Text>{selectedItem.supplierName} ({renderDeliveryInfo(selectedItem.leadTimeDays)})</Text>
            </p>
          </div>
        </Modal>
      )}

      {/* 일괄 발주 확인 모달 */}
      <Modal
        title="일괄 발주 확인"
        open={isBulkModalOpen}
        onOk={handleConfirmBulkOrder}
        onCancel={handleCancelBulkOrder}
        okText="일괄 발주 확정"
        cancelText="취소"
      >
        <Paragraph>선택한 {selectedItems.size}건의 항목을 일괄 발주하시겠습니까?</Paragraph>
        <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
          <List
            size="small"
            dataSource={recommendations.filter(r => selectedItems.has(r.inventoryId))}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  title={item.inventoryName}
                  description={`${item.recommendedOrderAmount}${item.unit} (${item.supplierName})`}
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </>
  );
};

export default RecommendationCard;

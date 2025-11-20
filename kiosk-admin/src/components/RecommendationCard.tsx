import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Spin, List, Button, Flex, message, InputNumber, Checkbox, Space, Tag } from 'antd';
import { BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getRecommendations, createPurchaseOrderFromRecommendation, createBatchPurchaseOrdersFromRecommendations } from '../api';
import type { Recommendation, RecommendationResponse } from '../api';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface RecommendationWithQuantity extends Recommendation {
  adjustedQuantity: number;
  selected: boolean;
}

const RecommendationCard: React.FC = () => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationWithQuantity[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const navigate = useNavigate();

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getRecommendations();
      setData(response);
      // 추천 데이터를 상태로 변환 (수량 조정 가능하도록)
      setRecommendations(response.recommendations.map(rec => ({
        ...rec,
        adjustedQuantity: rec.recommendedOrderAmount,
        selected: false,
      })));
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

  const handleCreateOrder = async (item: RecommendationWithQuantity) => {
    setOrderingId(item.inventoryId);
    try {
      await createPurchaseOrderFromRecommendation({
        inventoryId: item.inventoryId,
        supplierId: item.supplierId,
        quantity: item.adjustedQuantity,
      });
      message.success(`'${item.inventoryName}' 발주가 생성되었습니다. 발주 목록에서 확인해주세요.`);
      // Refresh recommendations after ordering
      fetchRecommendations();
    } catch (error) {
      message.error('발주 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setOrderingId(null);
    }
  };

  const handleBatchCreateOrders = async () => {
    const selectedItems = recommendations.filter(rec => rec.selected && rec.adjustedQuantity > 0);
    
    if (selectedItems.length === 0) {
      message.warning('발주할 품목을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      const items = selectedItems.map(item => ({
        inventoryId: item.inventoryId,
        supplierId: item.supplierId,
        quantity: item.adjustedQuantity,
      }));

      const response = await createBatchPurchaseOrdersFromRecommendations(items);
      message.success(`${response.message || `${selectedItems.length}개 품목의 발주가 생성되었습니다.`}`);
      fetchRecommendations();
      setBatchMode(false);
    } catch (error) {
      message.error('일괄 발주 생성에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (inventoryId: number, quantity: number | null) => {
    setRecommendations(prev => prev.map(rec => 
      rec.inventoryId === inventoryId 
        ? { ...rec, adjustedQuantity: quantity || 0 }
        : rec
    ));
  };

  const handleSelectChange = (inventoryId: number, selected: boolean) => {
    setRecommendations(prev => prev.map(rec => 
      rec.inventoryId === inventoryId 
        ? { ...rec, selected }
        : rec
    ));
  };

  const handleSelectAll = (selected: boolean) => {
    setRecommendations(prev => prev.map(rec => ({ ...rec, selected })));
  };

  if (loading && !data) { // Show initial loading spinner only on first load
    return (
      <Card>
        <Spin />
        <Text style={{ marginLeft: 16 }}>AI가 발주 추천을 생성하고 있습니다...</Text>
      </Card>
    );
  }

  if (!data) {
    return null; // Error case
  }

  return (
    <Card 
      title={
        <span style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>
          <BulbOutlined style={{ marginRight: 8, fontSize: '18px' }} /> 
          AI 발주 추천
        </span>
      }
      style={{ marginBottom: 24 }}
      headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      extra={loading && <Spin size="small" style={{ color: 'white' }} />}
    >
      <Paragraph style={{ 
        fontSize: '14px', 
        color: '#595959',
        marginBottom: '24px',
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        {data.message}
      </Paragraph>
      {recommendations.length > 0 ? (
        <>
          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Checkbox
              checked={batchMode}
              onChange={(e) => {
                setBatchMode(e.target.checked);
                if (!e.target.checked) {
                  handleSelectAll(false);
                }
              }}
            >
              일괄 발주 모드
            </Checkbox>
            {batchMode && (
              <Space>
                <Button onClick={() => handleSelectAll(true)}>전체 선택</Button>
                <Button onClick={() => handleSelectAll(false)}>전체 해제</Button>
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={handleBatchCreateOrders}
                  loading={loading}
                >
                  선택한 항목 일괄 발주 ({recommendations.filter(r => r.selected).length}개)
                </Button>
              </Space>
            )}
          </Flex>
          <List
            itemLayout="vertical"
            dataSource={recommendations}
            renderItem={item => (
              <List.Item
                key={item.inventoryId}
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                  border: item.selected && batchMode ? '2px solid #667eea' : '1px solid rgba(102, 126, 234, 0.2)'
                }}
                actions={batchMode ? [] : [
                  <Button 
                    type="primary" 
                    onClick={() => handleCreateOrder(item)}
                    loading={orderingId === item.inventoryId}
                    size="large"
                    style={{ marginRight: '8px' }}
                  >
                    이대로 발주 생성
                  </Button>,
                  <Button 
                    onClick={() => navigate('/purchase-orders')}
                    size="large"
                  >
                    발주 목록 보기
                  </Button>
                ]}
              >
                {batchMode && (
                  <Checkbox
                    checked={item.selected}
                    onChange={(e) => handleSelectChange(item.inventoryId, e.target.checked)}
                    style={{ marginRight: 12 }}
                  />
                )}
                <List.Item.Meta
                  title={
                    <Flex align="center" gap={8}>
                      <span>{item.inventoryName} 발주 추천</span>
                      {item.confidence && (
                        <Tag color={item.confidence === 'high' ? 'green' : 'orange'}>
                          {item.confidence === 'high' ? '높은 신뢰도' : '낮은 신뢰도'}
                        </Tag>
                      )}
                    </Flex>
                  }
                  description={<Text type="secondary">{item.reason}</Text>}
                />
                <Flex gap="large" style={{ marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <Text strong>현재 재고: </Text>
                    <Text>{item.currentStock}{item.unit}</Text>
                  </div>
                  <div>
                    <Text strong>예상 소모량: </Text>
                    <Text>{item.predictedUsage}{item.unit}/일</Text>
                  </div>
                  <div>
                    <Text strong>최적 공급처: </Text>
                    <Text>{item.supplierName} (리드타임: {item.leadTimeDays}일)</Text>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Text strong>발주 수량: </Text>
                    <InputNumber
                      min={0}
                      value={item.adjustedQuantity}
                      onChange={(value) => handleQuantityChange(item.inventoryId, value)}
                      addonAfter={item.unit}
                      style={{ width: 120 }}
                      precision={item.unit === 'kg' || item.unit === 'L' ? 2 : 0}
                    />
                    {item.adjustedQuantity !== item.recommendedOrderAmount && (
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                        (추천: {item.recommendedOrderAmount}{item.unit})
                      </Text>
                    )}
                  </div>
                </Flex>
              </List.Item>
            )}
          />
        </>
      ) : (
        <Text type="secondary">오늘은 추가 발주가 필요하지 않습니다.</Text>
      )}
    </Card>
  );
};

export default RecommendationCard;

import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Spin, List, Button, Flex, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { getRecommendations, createPurchaseOrderFromRecommendation } from '../api';
import type { Recommendation, RecommendationResponse } from '../api';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

const RecommendationCard: React.FC = () => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getRecommendations();
      setData(response);
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
      title={<><BulbOutlined style={{ marginRight: 8 }} /> AI 발주 추천</>}
      style={{ marginBottom: 24 }}
      extra={loading && <Spin size="small" />}
    >
      <Paragraph>{data.message}</Paragraph>
      {data.recommendations.length > 0 ? (
        <List
          itemLayout="vertical"
          dataSource={data.recommendations}
          renderItem={item => (
            <List.Item
              key={item.inventoryId}
              actions={[
                <Button 
                  type="primary" 
                  onClick={() => handleCreateOrder(item)}
                  loading={orderingId === item.inventoryId}
                >
                  이대로 발주 생성
                </Button>,
                <Button onClick={() => navigate('/purchase-orders')}>
                  발주 목록 보기
                </Button>
              ]}
            >
              <List.Item.Meta
                title={`${item.inventoryName} ${item.recommendedOrderAmount}${item.unit} 발주 추천`}
                description={<Text type="secondary">{item.reason}</Text>}
              />
              <Flex gap="large" style={{ marginTop: 16, flexWrap: 'wrap' }}>
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
              </Flex>
            </List.Item>
          )}
        />
      ) : (
        <Text type="secondary">오늘은 추가 발주가 필요하지 않습니다.</Text>
      )}
    </Card>
  );
};

export default RecommendationCard;

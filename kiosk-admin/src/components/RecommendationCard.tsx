import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, List, Tag, Button, Flex, message } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import { getRecommendations, RecommendationResponse } from '../api';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const RecommendationCard: React.FC = () => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecommendations = async () => {
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
    };

    fetchRecommendations();
  }, []);

  const handleGoToPurchaseOrder = () => {
    // TODO: 추천 내용을 담아서 발주 페이지로 이동하는 로직 추가
    navigate('/purchase-orders');
  };

  if (loading) {
    return (
      <Card>
        <Spin />
        <Text style={{ marginLeft: 16 }}>AI가 발주 추천을 생성하고 있습니다...</Text>
      </Card>
    );
  }

  if (!data) {
    return null; // 에러 발생 시 카드 숨김
  }

  return (
    <Card 
      title={<><BulbOutlined style={{ marginRight: 8 }} /> AI 발주 추천</>}
      style={{ marginBottom: 24 }}
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
                <Button type="primary" onClick={handleGoToPurchaseOrder}>
                  발주하러 가기
                </Button>
              ]}
            >
              <List.Item.Meta
                title={<Title level={5}>{item.inventoryName} {item.recommendedOrderAmount}{item.unit} 발주 추천</Title>}
                description={<Text type="secondary">{item.reason}</Text>}
              />
              <Flex gap="large" style={{ marginTop: 16 }}>
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

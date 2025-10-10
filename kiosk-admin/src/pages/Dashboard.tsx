// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message, List, Tag } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [totalSales, setTotalSales] = useState(0);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 여러 데이터를 한 번에 병렬로 요청
        const [salesRes, topProdRes, lowStockRes] = await Promise.all([
          api.get('/sales/summary'),
          api.get('/analytics/top-products'),
          api.get('/analytics/low-stock'),
        ]);
        setTotalSales(salesRes.data.totalSales);
        setTopProducts(topProdRes.data);
        setLowStockProducts(lowStockRes.data);
      } catch (error) {
        message.error("대시보드 데이터를 불러오는데 실패했습니다.");
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <Title level={3} style={{ marginBottom: '24px' }}>대시보드</Title>
      <Row gutter={[16, 16]}>
        {/* 총 매출액 카드 */}
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="총 매출액"
              value={totalSales}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="원"
            />
          </Card>
        </Col>

        {/* 인기 상품 TOP 5 카드 */}
        <Col xs={24} sm={12} md={8}>
          <Card title="인기 상품 TOP 5">
            <List
              dataSource={topProducts}
              renderItem={(item, index) => (
                <List.Item>
                  <Text strong>{index + 1}. {item.name}</Text> <Text type="secondary">{item.quantity}개 판매</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 재고 부족 상품 카드 */}
        <Col xs={24} sm={12} md={8}>
          <Card title="재고 부족 상품 (10개 이하)">
            <List
              dataSource={lowStockProducts}
              renderItem={item => (
                <List.Item>
                  <Text>{item.name}</Text> <Tag color="red">{item.stock}개 남음</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
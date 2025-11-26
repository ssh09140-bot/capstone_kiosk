
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Button, Space, Tag } from 'antd';
import { ArrowUpOutlined, RobotOutlined, ShopOutlined, DollarOutlined, CalendarOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import api from '../api';
import SalesAnalysisModal from '../components/SalesAnalysisModal';
import RecommendationCard from '../components/RecommendationCard';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [monthlySales, setMonthlySales] = useState<{ month: string; sales: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [bottomProducts, setBottomProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [profitSummary, setProfitSummary] = useState<{ totalRevenue: number; totalCost: number; totalProfit: number; } | null>(null);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, topProdRes, bottomProdRes, profitRes] = await Promise.all([
          api.get('/sales/summary'),
          api.get('/analytics/top-products'),
          api.get('/analytics/bottom-products'),
          api.get('/analytics/profit-summary'),
        ]);
        setCurrentMonthSales(salesRes.data.currentMonthSales);
        setMonthlySales(salesRes.data.monthlySalesData);
        setTopProducts(topProdRes.data);
        setBottomProducts(bottomProdRes.data);
        setProfitSummary(profitRes.data.overallSummary);
      } catch (error) {
        console.error("Failed to refresh dashboard data:", error);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const chartConfig = {
    data: monthlySales,
    xField: 'month',
    yField: 'sales',
    height: 200,
    color: '#1677ff',
    meta: {
      sales: {
        alias: '매출액',
        formatter: (v: number) => `${v.toLocaleString()}원`,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 12px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header Section */}
        <div style={{ marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>대시보드</Title>
          <Text type="secondary">매장 현황을 한눈에 확인하고 AI 기반 인사이트를 얻으세요.</Text>
        </div>

        {/* Key Metrics Section */}
        {profitSummary && (
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={8} lg={6}>
              <Card bordered={false} hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="총 매출"
                  value={profitSummary.totalRevenue}
                  suffix="원"
                  prefix={<DollarOutlined style={{ color: '#1677ff', fontSize: 24, background: '#e6f7ff', padding: 8, borderRadius: '50%' }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <Card bordered={false} hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="총 원가"
                  value={profitSummary.totalCost}
                  suffix="원"
                  prefix={<ShopOutlined style={{ color: '#faad14', fontSize: 24, background: '#fffbe6', padding: 8, borderRadius: '50%' }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="이번 달 매출액"
                  value={currentMonthSales}
                  suffix="원"
                  prefix={<CalendarOutlined style={{ color: '#722ed1', fontSize: 24, background: '#f9f0ff', padding: 8, borderRadius: '50%' }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <Card bordered={false} hoverable style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="총 이익"
                  value={profitSummary.totalProfit}
                  valueStyle={{ color: '#3f8600', fontWeight: 700, fontSize: 24 }}
                  suffix="원"
                  prefix={<ArrowUpOutlined style={{ fontSize: 24, background: '#f6ffed', padding: 8, borderRadius: '50%', color: '#52c41a' }} />}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* AI Insights Section */}
        <RecommendationCard />

        {/* Charts & Analysis Section */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card title="월별 매출 추이" bordered={false} style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Text type="secondary">이번 달 매출액</Text>
                <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
                  {currentMonthSales.toLocaleString()}원
                </Title>
              </div>
              <Column {...chartConfig} />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="AI 월간 분석" bordered={false} style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, padding: '20px 0' }}>
                <div style={{ background: '#e6f7ff', padding: 20, borderRadius: '50%', marginBottom: 20 }}>
                  <RobotOutlined style={{ fontSize: 40, color: '#1677ff' }} />
                </div>
                <Text style={{ marginBottom: 24, textAlign: 'center', color: '#666', fontSize: 15, lineHeight: 1.6 }}>
                  지난 한 달간의 판매 데이터를 분석하여<br />
                  <strong>매출 증대 전략</strong>을 제안합니다.
                </Text>
                <Button type="primary" size="large" icon={<RobotOutlined />} onClick={() => setAnalysisModalOpen(true)} block style={{ height: 48, borderRadius: 8 }}>
                  분석 리포트 확인하기
                </Button>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Product Rankings Section */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="인기 상품 TOP 5" bordered={false} style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <List
                itemLayout="horizontal"
                dataSource={topProducts}
                renderItem={(item, index) => (
                  <List.Item style={{ padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: index < 3 ? '#1677ff' : '#f5f5f5',
                          color: index < 3 ? '#fff' : '#8c8c8c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 14
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={<Text strong style={{ fontSize: 15 }}>{item.name}</Text>}
                    />
                    <Tag color="blue" style={{ borderRadius: 12, padding: '0 10px' }}>{item.quantity}개</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="비인기 상품 TOP 5" bordered={false} style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <List
                itemLayout="horizontal"
                dataSource={bottomProducts}
                renderItem={(item, index) => (
                  <List.Item style={{ padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: index < 3 ? '#ff4d4f' : '#f5f5f5',
                          color: index < 3 ? '#fff' : '#8c8c8c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: 14
                        }}>
                          {index + 1}
                        </div>
                      }
                      title={<Text strong style={{ fontSize: 15 }}>{item.name}</Text>}
                    />
                    <Tag color="red" style={{ borderRadius: 12, padding: '0 10px' }}>{item.quantity}개</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <SalesAnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setAnalysisModalOpen(false)}
          topProducts={topProducts}
          bottomProducts={bottomProducts}
        />
      </Space>
    </div>
  );
};

export default Dashboard;
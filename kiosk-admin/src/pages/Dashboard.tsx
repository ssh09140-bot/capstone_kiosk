import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Button } from 'antd';
import { ArrowUpOutlined, RobotOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import api from '../api';
import SalesAnalysisModal from '../components/SalesAnalysisModal';
import RecommendationCard from '../components/RecommendationCard';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [monthlySales, setMonthlySales] = useState<{ month: string; sales: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [profitSummary, setProfitSummary] = useState<{ totalRevenue: number; totalCost: number; totalProfit: number; } | null>(null);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, topProdRes, profitRes] = await Promise.all([
          api.get('/sales/summary'),
          api.get('/analytics/top-products'),
          api.get('/analytics/profit-summary'), // Fetch profit data
        ]);
        setCurrentMonthSales(salesRes.data.currentMonthSales);
        setMonthlySales(salesRes.data.monthlySalesData);
        setTopProducts(topProdRes.data);
        setProfitSummary(profitRes.data.overallSummary); // Set profit data
      } catch (error) {
        // 첫 로딩이 아닌 경우, 백그라운드 에러는 조용히 처리할 수 있도록 console.error 사용
        console.error("Failed to refresh dashboard data:", error);
      }
    };

    fetchData(); // 초기 데이터 로딩

    const intervalId = setInterval(fetchData, 30000); // 30초마다 데이터 새로고침

    return () => clearInterval(intervalId); // 컴포넌트 언마운트 시 인터벌 정리
  }, []);

  const chartConfig = {
    data: monthlySales,
    xField: 'month',
    yField: 'sales',
    height: 200,
    meta: {
      sales: {
        alias: '매출액',
        formatter: (v: number) => `${v.toLocaleString()}원`,
      },
    },
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: '24px' }}>대시보드</Title>
      
      <Row>
        <Col span={24}>
          <RecommendationCard />
        </Col>
      </Row>

      {profitSummary && (
        <Card title="최근 30일 수익 요약" style={{ marginTop: 24 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Statistic title="총 매출" value={profitSummary.totalRevenue} suffix="원" />
                </Col>
                <Col span={8}>
                    <Statistic title="총 원가" value={profitSummary.totalCost} suffix="원" />
                </Col>
                <Col span={8}>
                    <Statistic title="총 이익" value={profitSummary.totalProfit} valueStyle={{ color: '#3f8600' }} suffix="원" />
                </Col>
            </Row>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 월별 매출 현황 카드 */}
        <Col xs={24} lg={12}>
          <Card title="월별 매출 현황">
            <Statistic
              title="이번 달 매출액"
              value={currentMonthSales}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="원"
            />
            <div style={{ marginTop: 24 }}>
              <Column {...chartConfig} />
            </div>
          </Card>
        </Col>

        {/* AI 월간 판매 분석 카드 */}
        <Col xs={24} lg={12}>
          <Card title="AI 월간 판매 분석">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 328 }}>
              <Text style={{ marginBottom: 16, textAlign: 'center' }}>지난 한 달간의 판매 데이터를 기반으로<br/>AI가 메뉴 개선 방안을 제안합니다.</Text>
              <Button type="primary" icon={<RobotOutlined />} onClick={() => setAnalysisModalOpen(true)}>
                분석 리포트 보기
              </Button>
            </div>
          </Card>
        </Col>

        {/* 인기 상품 TOP 5 카드 */}
        <Col xs={24} lg={12}>
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
      </Row>

      <SalesAnalysisModal 
        isOpen={isAnalysisModalOpen} 
        onClose={() => setAnalysisModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
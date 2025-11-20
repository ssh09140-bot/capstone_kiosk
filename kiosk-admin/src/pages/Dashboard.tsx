import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Button } from 'antd';
import { ArrowUpOutlined, RobotOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import api from '../api';
import SalesAnalysisModal from '../components/SalesAnalysisModal';
import RecommendationCard from '../components/RecommendationCard';
import { useIsMobile } from '../hooks/useIsMobile';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const isMobile = useIsMobile();
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
    height: isMobile ? 220 : 280,
    autoFit: true,
    color: 'l(270) 0:#667eea 1:#764ba2',
    columnStyle: {
      radius: [8, 8, 0, 0],
      fill: 'l(270) 0:#667eea 1:#764ba2',
    },
    meta: {
      sales: {
        alias: '매출액',
        formatter: (v: number) => `${v.toLocaleString()}원`,
      },
      month: {
        alias: '월',
      },
    },
    xAxis: {
      label: {
        style: {
          fill: '#595959',
          fontSize: 12,
        },
      },
      line: {
        style: {
          stroke: '#e8e8e8',
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#595959',
          fontSize: 12,
        },
        formatter: (v: string) => {
          const num = parseInt(v);
          if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
          if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
          return v;
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#f0f0f0',
            lineDash: [4, 4],
          },
        },
      },
    },
    tooltip: {
      domStyles: {
        'g2-tooltip': {
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
          borderRadius: '8px',
          border: 'none',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        'g2-tooltip-title': {
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
        },
        'g2-tooltip-list-item': {
          color: 'white',
          fontSize: '13px',
        },
      },
      formatter: (datum: any) => {
        return {
          name: '매출액',
          value: `${datum.sales.toLocaleString()}원`,
        };
      },
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 2000,
      },
    },
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ 
          margin: 0, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '32px',
          fontWeight: 700
        }}>
          대시보드
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
          매장 운영 현황을 한눈에 확인하세요
        </Text>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <RecommendationCard />
        </Col>
      </Row>

      {profitSummary && (
        <Card 
          title={<span style={{ color: 'white' }}>💰 최근 30일 수익 요약</span>} 
          style={{ marginTop: isMobile ? 16 : 24 }}
          headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Statistic 
                      title="총 매출" 
                      value={profitSummary.totalRevenue} 
                      suffix="원"
                      valueStyle={{ 
                        color: '#1890ff', 
                        fontSize: isMobile ? '22px' : '28px',
                        fontWeight: 700
                      }}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <Statistic 
                      title="총 원가" 
                      value={profitSummary.totalCost} 
                      suffix="원"
                      valueStyle={{ 
                        color: '#fa8c16', 
                        fontSize: isMobile ? '22px' : '28px',
                        fontWeight: 700
                      }}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <Statistic 
                      title="총 이익" 
                      value={profitSummary.totalProfit} 
                      valueStyle={{ 
                        color: '#52c41a', 
                        fontSize: isMobile ? '22px' : '28px',
                        fontWeight: 700
                      }} 
                      suffix="원"
                      prefix={<ArrowUpOutlined />}
                    />
                </Col>
            </Row>
        </Card>
      )}

      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]} style={{ marginTop: isMobile ? 16 : 24 }}>
        {/* 월별 매출 현황 카드 */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>📊 월별 매출 현황</span>}
            headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <Statistic
              title="이번 달 매출액"
              value={currentMonthSales}
              precision={0}
              valueStyle={{ 
                color: '#52c41a',
                fontSize: isMobile ? '24px' : '32px',
                fontWeight: 700,
                marginBottom: isMobile ? '16px' : '24px'
              }}
              prefix={<ArrowUpOutlined />}
              suffix="원"
            />
            <div style={{ marginTop: isMobile ? 16 : 24 }}>
              <Column {...chartConfig} />
            </div>
          </Card>
        </Col>

        {/* AI 월간 판매 분석 카드 */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>🤖 AI 월간 판매 분석</span>}
            headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              minHeight: isMobile ? 240 : 328,
              padding: isMobile ? '24px 16px' : '40px 20px'
            }}>
              <RobotOutlined style={{ fontSize: isMobile ? '48px' : '64px', color: '#667eea', marginBottom: isMobile ? '16px' : '24px' }} />
              <Text style={{ 
                marginBottom: isMobile ? 16 : 24, 
                textAlign: 'center',
                fontSize: isMobile ? '14px' : '16px',
                color: '#595959',
                lineHeight: '1.6'
              }}>
                지난 한 달간의 판매 데이터를 기반으로<br/>
                AI가 메뉴 개선 방안을 제안합니다.
              </Text>
              <Button 
                type="primary" 
                icon={<RobotOutlined />} 
                onClick={() => setAnalysisModalOpen(true)}
                size={isMobile ? 'middle' : 'large'}
                style={{
                  height: isMobile ? '40px' : '48px',
                  padding: isMobile ? '0 24px' : '0 32px',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 600
                }}
              >
                분석 리포트 보기
              </Button>
            </div>
          </Card>
        </Col>

        {/* 인기 상품 TOP 5 카드 */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: 'white' }}>🏆 인기 상품 TOP 5</span>}
            headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <List
              dataSource={topProducts}
              renderItem={(item, index) => (
                <List.Item style={{ 
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  background: index === 0 ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' : 'transparent',
                  border: index === 0 ? '2px solid #667eea' : '1px solid #f0f0f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index === 0 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : '#f0f0f0',
                      color: index === 0 ? 'white' : '#595959',
                      fontWeight: 700,
                      marginRight: '12px',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </span>
                    <Text strong style={{ fontSize: '16px', flex: 1 }}>{item.name}</Text>
                    <Text type="secondary" style={{ fontSize: '14px' }}>{item.quantity}개 판매</Text>
                  </div>
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

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message, DatePicker, Spin, Flex } from 'antd';
import { LineChartOutlined, ShoppingCartOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { Line, Column, Area } from '@ant-design/charts';
import { getAnalyticsReport, type ReportResponse } from '../api';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './Reports.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const Reports: React.FC = () => {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<RangeValue>([dayjs().subtract(29, 'days'), dayjs()]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return;

      setLoading(true);
      try {
        const params = {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
        };
        const response = await getAnalyticsReport(params);
        setData(response);
      } catch (error) {
        message.error("리포트 데이터를 불러오는 데 실패했습니다.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [dateRange]);

  const onRangeChange = (dates: RangeValue) => {
    setDateRange(dates);
  };

  const processedSalesByHour = Array.from({ length: 24 }, (_, i) => {
    const hourData = (data?.salesByHour || []).find(d => d.hour === i);
    return {
      hour: `${i}시`,
      sales: hourData ? hourData.sales : 0,
    };
  });

  const lineChartConfig = {
    data: data?.dailyTrends || [],
    xField: 'date',
    yField: 'sales',
    height: isMobile ? 250 : 300,
    yAxis: {
      label: {
        formatter: (v: string) => `${parseInt(v).toLocaleString()}원`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: '매출',
        value: `${datum.sales.toLocaleString()}원`,
      }),
    },
    point: {
      shape: 'circle',
      size: 4,
    },
  };

  const topProductsConfig = {
    data: data?.topProducts || [],
    xField: 'name',
    yField: 'quantity',
    height: isMobile ? 250 : 300,
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      name: { alias: '상품명' },
      quantity: { alias: '판매량' },
    },
    color: '#1677ff',
  };

  const bottomProductsConfig = {
    data: data?.bottomProducts || [],
    xField: 'name',
    yField: 'quantity',
    height: isMobile ? 250 : 300,
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      name: { alias: '상품명' },
      quantity: { alias: '판매량' },
    },
    color: '#ff4d4f',
  };

  const salesByHourConfig = {
    data: processedSalesByHour,
    xField: 'hour',
    yField: 'sales',
    height: isMobile ? 250 : 300,
    smooth: true,
    color: 'l(270) 0:#ffffff 1:#7ec2f3',
    areaStyle: () => ({
      fill: 'l(270) 0:#ffffff 1:#7ec2f3',
    }),
    xAxis: {
      range: [0, 1],
      tickCount: isMobile ? 6 : 12,
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${parseInt(v).toLocaleString()}원`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: '매출',
        value: `${datum.sales.toLocaleString()}원`,
      }),
    },
  };

  return (
    <div className="reports-container">
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={isMobile ? 12 : 16}
        style={{ marginBottom: isMobile ? 16 : 24 }}
      >
        <Title level={3} style={{ margin: 0 }}>상세 분석 리포트</Title>
        <RangePicker
          value={dateRange}
          onChange={onRangeChange}
          style={{ width: isMobile ? '100%' : 'auto' }}
        />
      </Flex>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>데이터 분석 중...</Text>
        </div>
      ) : data ? (
        <>
          <Row gutter={[16, 16]} className="summary-cards">
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="총 매출"
                  value={data.summary.totalSales}
                  precision={0}
                  prefix={<DollarCircleOutlined />}
                  suffix="원"
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="총 주문 수"
                  value={data.summary.totalOrders}
                  precision={0}
                  prefix={<ShoppingCartOutlined />}
                  suffix="건"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="평균 주문 금액"
                  value={data.summary.averageOrderValue}
                  precision={0}
                  prefix={<LineChartOutlined />}
                  suffix="원"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="매출 추이" className="chart-card" style={{ marginTop: isMobile ? 16 : 24 }}>
            <Line {...lineChartConfig} />
          </Card>

          <Row gutter={[16, 16]} style={{ marginTop: isMobile ? 16 : 24 }}>
            <Col xs={24} lg={12}>
              <Card title="인기 상품 Top 5" className="chart-card">
                <Column {...topProductsConfig} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="비인기 상품 Top 5" className="chart-card">
                <Column {...bottomProductsConfig} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: isMobile ? 16 : 24 }}>
            <Col xs={24}>
              <Card title="시간대별 매출 분석" className="chart-card">
                <Area {...salesByHourConfig} />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">데이터가 없습니다.</Text>
        </Card>
      )}
    </div>
  );
};

export default Reports;

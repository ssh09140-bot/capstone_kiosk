import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message, DatePicker, Spin, Flex } from 'antd';
import { LineChartOutlined, ShoppingCartOutlined, DollarCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { Area, Line } from '@ant-design/charts';
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

  // Line Chart Configuration (Daily Trends)
  const dailySalesConfig = {
    data: data?.dailyTrends || [],
    xField: 'date',
    yField: 'sales',
    height: 350,
    smooth: true,
    color: '#3B82F6',
    lineStyle: {
      lineWidth: 3,
    },
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: '#3B82F6',
        stroke: '#fff',
        lineWidth: 2,
      },
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${parseInt(v).toLocaleString()}원`,
        style: { fontSize: 12, fill: '#6b7280', fontWeight: 500 },
      },
      grid: { line: { style: { lineDash: [4, 4], stroke: '#e5e7eb' } } },
    },
    xAxis: {
      label: { style: { fontSize: 12, fill: '#6b7280', fontWeight: 500 } },
      grid: { line: { style: { stroke: 'transparent' } } },
    },
    tooltip: {
      title: (datum: any) => datum.date,
      formatter: (datum: any) => {
        return { name: '매출액', value: `${datum.sales.toLocaleString()}원` };
      },
    },
    label: {
      style: { fill: '#000000', fontSize: 12, fontWeight: 'bold' },
      formatter: (item: any) => {
        const sales = item?.sales || 0;
        if (sales === 0) return '';
        return `${sales.toLocaleString()}원`;
      },
    },
    animation: {
      appear: { animation: 'path-in', duration: 1000 },
    },
  };

  // Area Chart Configuration (Sales by Hour) - Cyan to Blue Gradient
  const hourlyAreaConfig = {
    data: processedSalesByHour,
    xField: 'hour',
    yField: 'sales',
    height: 350,
    color: 'l(270) 0:#eff6ff 0.5:#06B6D4 1:#2563EB', // Lighter start to cyan to blue
    line: {
      color: '#2563EB',
      size: 3
    },
    areaStyle: { fillOpacity: 0.6 }, // Slightly increased opacity for richer color
    smooth: true,
    yAxis: {
      label: {
        formatter: (v: string) => `${parseInt(v).toLocaleString()}원`,
        style: { fontSize: 12, fill: '#6b7280', fontWeight: 500 },
      },
      grid: { line: { style: { lineDash: [4, 4], stroke: '#e5e7eb' } } },
    },
    tooltip: {
      title: (datum: any) => datum.hour,
      formatter: (datum: any) => {
        return { name: '매출액', value: `${datum.sales.toLocaleString()}원` };
      },
    },
  };



  const renderOverviewTab = () => (
    <div className="fade-in-up">
      <Row gutter={[24, 24]} className="summary-cards">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="총 매출"
              value={data?.summary.totalSales}
              precision={0}
              prefix={<DollarCircleOutlined />}
              suffix="원"
              valueStyle={{ color: '#3B82F6', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="총 주문 수"
              value={data?.summary.totalOrders}
              precision={0}
              prefix={<ShoppingCartOutlined />}
              suffix="건"
              valueStyle={{ color: '#059669', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="평균 주문 금액"
              value={data?.summary.averageOrderValue}
              precision={0}
              prefix={<LineChartOutlined />}
              suffix="원"
              valueStyle={{ color: '#f59e0b', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="📈 일별 매출 추이" className="chart-card">
            <Line {...dailySalesConfig} />
          </Card>
        </Col>
        <Col span={24}>
          <Card title="⏰ 시간대별 매출 패턴" className="chart-card">
            <Area {...hourlyAreaConfig} />
          </Card>
        </Col>
      </Row>
    </div>
  );



  return (
    <div className="reports-container">
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={isMobile ? 12 : 16}
        style={{ marginBottom: 24 }}
      >
        <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#1a1a1a' }}>
          <BarChartOutlined style={{ marginRight: 12, color: '#3B82F6' }} />
          상세 리포트
        </Title>
        <RangePicker
          value={dateRange}
          onChange={onRangeChange}
          className="custom-range-picker"
          size="large"
        />
      </Flex>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" tip="데이터를 분석하고 있습니다..." />
        </div>
      ) : data ? (
        renderOverviewTab()
      ) : (
        <Card style={{ textAlign: 'center', padding: '80px' }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>데이터를 불러올 수 없습니다.</Text>
        </Card>
      )}
    </div>
  );
};

export default Reports;
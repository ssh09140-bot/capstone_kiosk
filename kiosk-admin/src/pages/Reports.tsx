import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message, DatePicker, Spin, Flex } from 'antd';
import { LineChartOutlined, ShoppingCartOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { Line, Bar } from '@ant-design/charts';
import { getAnalyticsReport, type ReportResponse } from '../api';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const Reports: React.FC = () => {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<RangeValue>([dayjs().subtract(29, 'days'), dayjs()]);

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

  const lineChartConfig = {
    data: data?.dailyTrends || [],
    xField: 'date',
    yField: 'sales',
    height: 300,
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
    xField: 'quantity',
    yField: 'name',
    isStack: false,
    height: 300,
    xAxis: {
      label: {
        formatter: (v: string) => `${v}개`,
      },
    },
    yAxis: {
      title: { text: '상품명' }
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: '판매량',
        value: `${datum.quantity}개`,
      }),
    },
  };

  const salesByHourConfig = {
    data: data?.salesByHour || [],
    xField: 'hour',
    yField: 'sales',
    height: 300,
    xAxis: {
      title: { text: '시간' },
      tickCount: 24,
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
    <div>
      <Flex justify="space-between" align="center" wrap="wrap" style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>상세 분석 리포트</Title>
        <RangePicker value={dateRange} onChange={onRangeChange} />
      </Flex>

      {loading ? (
        <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />
      ) : data ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="총 매출"
                  value={data.summary.totalSales}
                  precision={0}
                  prefix={<DollarCircleOutlined />}
                  suffix="원"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="총 주문 수"
                  value={data.summary.totalOrders}
                  precision={0}
                  prefix={<ShoppingCartOutlined />}
                  suffix="건"
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="평균 주문 금액"
                  value={data.summary.averageOrderValue}
                  precision={0}
                  prefix={<LineChartOutlined />}
                  suffix="원"
                />
              </Card>
            </Col>
          </Row>
          
          <Card title="매출 추이" style={{ marginTop: 24 }}>
            <Line {...lineChartConfig} />
          </Card>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="인기 상품 Top 5">
                <Bar {...topProductsConfig} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="시간대별 매출 분석">
                <Bar {...salesByHourConfig} />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Text>데이터가 없습니다.</Text>
      )}
    </div>
  );
};

export default Reports;

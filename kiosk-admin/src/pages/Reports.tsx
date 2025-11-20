import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message, DatePicker, Spin, Flex } from 'antd';
import { LineChartOutlined, ShoppingCartOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { Line, Bar, Column } from '@ant-design/charts';
import { getAnalyticsReport, type ReportResponse } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const Reports: React.FC = () => {
  const isMobile = useIsMobile();
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

  // --- Data processing for Sales by Hour Chart ---
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
    height: isMobile ? 250 : 350,
    smooth: true,
    color: 'l(0) 0:#667eea 1:#764ba2',
    lineStyle: {
      lineWidth: 3,
      stroke: 'l(0) 0:#667eea 1:#764ba2',
    },
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: '#667eea',
        stroke: '#fff',
        lineWidth: 2,
      },
    },
    areaStyle: () => ({
      fill: 'l(270) 0:rgba(102, 126, 234, 0.4) 1:rgba(118, 75, 162, 0.1)',
    }),
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
      formatter: (datum: any) => ({
        name: '매출',
        value: `${datum.sales.toLocaleString()}원`,
      }),
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 2000,
      },
    },
  };

  const topProductsConfig = {
    data: data?.topProducts || [],
    xField: 'quantity',
    yField: 'name',
    isStack: false,
    height: isMobile ? 250 : 350,
    color: (datum: any, defaultColor: string) => {
      const colors = [
        'l(270) 0:#667eea 1:#764ba2',
        'l(270) 0:#f093fb 1:#f5576c',
        'l(270) 0:#4facfe 1:#00f2fe',
        'l(270) 0:#43e97b 1:#38f9d7',
        'l(270) 0:#fa709a 1:#fee140',
      ];
      const index = (data?.topProducts || []).findIndex((p: any) => p.name === datum.name);
      return colors[index] || defaultColor;
    },
    barStyle: {
      radius: [0, 8, 8, 0],
    },
    xAxis: {
      label: {
        style: {
          fill: '#595959',
          fontSize: 12,
        },
        formatter: (v: string) => `${v}개`,
      },
      line: {
        style: {
          stroke: '#e8e8e8',
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
    yAxis: {
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
      formatter: (datum: any) => ({
        name: '판매량',
        value: `${datum.quantity}개`,
      }),
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 2000,
      },
    },
  };

  const salesByHourConfig = {
    data: processedSalesByHour,
    xField: 'hour',
    yField: 'sales',
    height: isMobile ? 250 : 350,
    autoFit: true,
    color: (datum: any) => {
      // 시간대별로 다른 그라데이션 색상 적용
      const hour = parseInt(datum.hour);
      if (hour >= 6 && hour < 12) {
        // 오전: 오렌지-핑크 그라데이션
        return 'l(270) 0:#ff9a9e 1:#fecfef';
      } else if (hour >= 12 && hour < 18) {
        // 오후: 보라-블루 그라데이션
        return 'l(270) 0:#667eea 1:#764ba2';
      } else if (hour >= 18 && hour < 22) {
        // 저녁: 핑크-레드 그라데이션
        return 'l(270) 0:#f093fb 1:#f5576c';
      } else {
        // 심야/새벽: 블루-시안 그라데이션
        return 'l(270) 0:#4facfe 1:#00f2fe';
      }
    },
    columnStyle: {
      radius: [12, 12, 0, 0],
    },
    meta: {
      sales: {
        alias: '매출액',
        formatter: (v: number) => `${v.toLocaleString()}원`,
      },
      hour: {
        alias: '시간',
      },
    },
    xAxis: {
      label: {
        style: {
          fill: '#595959',
          fontSize: 11,
          fontWeight: 500,
        },
        autoRotate: false,
        autoHide: false,
      },
      line: {
        style: {
          stroke: '#e8e8e8',
          lineWidth: 1,
        },
      },
      tickLine: {
        style: {
          stroke: '#e8e8e8',
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fill: '#595959',
          fontSize: 11,
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
            lineDash: [2, 2],
            lineWidth: 1,
          },
        },
      },
      line: {
        style: {
          stroke: '#e8e8e8',
        },
      },
    },
    tooltip: {
      domStyles: {
        'g2-tooltip': {
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.98) 0%, rgba(118, 75, 162, 0.98) 100%)',
          borderRadius: '10px',
          border: 'none',
          padding: '14px 18px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
        },
        'g2-tooltip-title': {
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '6px',
        },
        'g2-tooltip-list-item': {
          color: 'white',
          fontSize: '13px',
          lineHeight: '1.8',
        },
        'g2-tooltip-marker': {
          width: '8px',
          height: '8px',
          borderRadius: '50%',
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
        animation: 'scale-in-y',
        duration: 1500,
        easing: 'ease-out',
      },
      update: {
        animation: 'scale-in-y',
        duration: 800,
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
      {
        type: 'tooltip',
      },
    ],
  };

  return (
    <div>
      <div style={{ marginBottom: isMobile ? '20px' : '32px' }}>
        <Title level={2} style={{ 
          margin: 0, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: 700
        }}>
          상세 분석 리포트
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px', marginTop: '8px', display: 'block' }}>
          기간별 매출 및 판매 데이터를 분석합니다
        </Text>
      </div>

      <Flex justify="flex-end" align="center" wrap="wrap" style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <RangePicker 
          value={dateRange} 
          onChange={onRangeChange}
          style={{ borderRadius: '8px', width: isMobile ? '100%' : 'auto' }}
          size={isMobile ? 'middle' : 'large'}
        />
      </Flex>

      {loading ? (
        <Spin size="large" style={{ display: 'block', marginTop: '50px' }} />
      ) : data ? (
        <>
          <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
            <Col xs={24} sm={8}>
              <Card 
                title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>💰 총 매출</span>}
                headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Statistic
                  value={data.summary.totalSales}
                  precision={0}
                  prefix={<DollarCircleOutlined />}
                  suffix="원"
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '22px' : '28px', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>🛒 총 주문 수</span>}
                headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Statistic
                  value={data.summary.totalOrders}
                  precision={0}
                  prefix={<ShoppingCartOutlined />}
                  suffix="건"
                  valueStyle={{ color: '#52c41a', fontSize: isMobile ? '22px' : '28px', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>📈 평균 주문 금액</span>}
                headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Statistic
                  value={data.summary.averageOrderValue}
                  precision={0}
                  prefix={<LineChartOutlined />}
                  suffix="원"
                  valueStyle={{ color: '#fa8c16', fontSize: isMobile ? '22px' : '28px', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>
          
          <Card 
            title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>📊 매출 추이</span>}
            headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            style={{ marginTop: isMobile ? 16 : 24 }}
          >
            <Line {...lineChartConfig} />
          </Card>

          <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]} style={{ marginTop: isMobile ? 16 : 24 }}>
            <Col xs={24} lg={12}>
              <Card 
                title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>🏆 인기 상품 Top 5</span>}
                headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Bar {...topProductsConfig} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title={<span style={{ color: 'white', fontSize: isMobile ? '14px' : '16px' }}>⏰ 시간대별 매출 분석</span>}
                headStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                <Column {...salesByHourConfig} />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card>
          <Text type="secondary" style={{ fontSize: '16px' }}>데이터가 없습니다.</Text>
        </Card>
      )}
    </div>
  );
};

export default Reports;

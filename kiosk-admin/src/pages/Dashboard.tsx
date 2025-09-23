import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, message } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';
import api from '../api'; // axios 대신 api를 import

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    const fetchSalesSummary = async () => {
      try {
        const response = await api.get('http://localhost:3000/api/sales/summary');
        setTotalSales(response.data.totalSales);
      } catch (error) {
        console.error("매출 정보를 불러오지 못했습니다.", error);
        message.error("매출 정보를 불러오는 데 실패했습니다.");
      }
    };
    fetchSalesSummary();
  }, []);

  return (
    <div>
      <Title level={3} style={{ marginBottom: '24px' }}>대시보드</Title>
      <Row gutter={16}>
        <Col span={8}>
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
      </Row>
    </div>
  );
};

export default Dashboard;
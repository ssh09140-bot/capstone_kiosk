import React from 'react';
import { Card, Typography, Button } from 'antd';
import { Link } from 'react-router-dom';
import { BulbOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const AutoOrder: React.FC = () => {
  return (
    <Card>
      <Flex vertical align="center" justify="center" style={{ textAlign: 'center', padding: '40px 0' }}>
        <Title level={4}>이 페이지는 더 이상 사용되지 않습니다.</Title>
        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 24 }}>
          새로운 AI 발주 추천 기능은 대시보드에서 직접 확인하실 수 있습니다.
        </Paragraph>
        <Link to="/">
          <Button type="primary" icon={<BulbOutlined />}>
            대시보드로 이동
          </Button>
        </Link>
      </Flex>
    </Card>
  );
};

// Flex 컴포넌트를 사용하기 위해 antd에서 가져옵니다.
import { Flex } from 'antd';

export default AutoOrder;

import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Alert, Space, Button, message } from 'antd';
import { RobotOutlined, CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text, Paragraph } = Typography;

interface HygieneCheckResult {
    status: '양호' | '주의' | '심각';
    reason: string;
    message: string;
}

const HygieneCheckCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<HygieneCheckResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchHygieneCheck = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/analytics/hygiene-check');
            setData(response.data);
        } catch (err) {
            console.error('Failed to fetch hygiene check:', err);
            setError('위생 점검 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHygieneCheck();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case '양호': return 'success';
            case '주의': return 'warning';
            case '심각': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case '양호': return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
            case '주의': return <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />;
            case '심각': return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
            default: return <RobotOutlined />;
        }
    };

    const handleClean = async () => {
        try {
            await api.post('/analytics/hygiene-check/clean');
            message.success('청소 완료 상태가 기록되었습니다.');
            fetchHygieneCheck();
        } catch (error) {
            message.error('청소 상태 업데이트에 실패했습니다.');
        }
    };

    return (
        <Card
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1677ff' }} />
                    <span>AI 위생 관리자</span>
                </Space>
            }
            extra={
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        onClick={handleClean}
                        style={{ backgroundColor: '#52c41a' }}
                    >
                        청소 완료
                    </Button>
                    <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={fetchHygieneCheck}
                        loading={loading}
                    />
                </Space>
            }
            bordered={false}
            style={{ height: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Spin tip="매장 상태 분석 중..." />
                </div>
            ) : error ? (
                <Alert type="error" message={error} showIcon />
            ) : data ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {getStatusIcon(data.status)}
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>현재 상태</Text>
                            <Title level={4} style={{ margin: 0 }}>{data.status}</Title>
                        </div>
                    </div>

                    <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                        <Text strong>분석 결과:</Text>
                        <Paragraph style={{ margin: '4px 0 0' }}>{data.reason}</Paragraph>
                    </div>

                    <Alert
                        message={data.message}
                        type={getStatusColor(data.status) as any}
                        showIcon
                        style={{ borderRadius: 8 }}
                    />
                </div>
            ) : (
                <Text type="secondary">데이터가 없습니다.</Text>
            )}
        </Card>
    );
};

export default HygieneCheckCard;

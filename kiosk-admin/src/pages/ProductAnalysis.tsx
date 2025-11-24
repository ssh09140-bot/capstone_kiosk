import React, { useState, useEffect } from 'react';
import { Modal, Card, Typography, Spin, Alert, Row, Col, Statistic } from 'antd';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FireOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;

interface AnalysisData {
    date: string;
    temperature: number;
    quantity: number;
}

interface AnalysisResult {
    stats: {
        sensitivity: number;
        intercept: number;
        correlation: number;
    };
    data: AnalysisData[];
    recommendation: string;
}

interface ProductAnalysisProps {
    visible: boolean;
    onClose: () => void;
    product: { id: string; name: string } | null;
}

const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ visible, onClose, product }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        if (visible && product) {
            fetchAnalysis();
        }
    }, [visible, product]);

    const fetchAnalysis = async () => {
        if (!product) return;
        setLoading(true);
        try {
            const response = await api.get(`/analysis/temperature/${product.id}`);
            setResult(response.data.data);
        } catch (error) {
            console.error('Failed to fetch analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate Trend Line Data
    const getTrendLineData = () => {
        if (!result) return [];
        const minTemp = Math.min(...result.data.map(d => d.temperature));
        const maxTemp = Math.max(...result.data.map(d => d.temperature));

        return [
            { temperature: minTemp, quantity: result.stats.sensitivity * minTemp + result.stats.intercept },
            { temperature: maxTemp, quantity: result.stats.sensitivity * maxTemp + result.stats.intercept },
        ];
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FireOutlined style={{ color: '#ff4d4f' }} />
                    <span>{product?.name} - 기온 상관관계 분석</span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" tip="데이터 분석 중..." />
                </div>
            ) : result ? (
                <div style={{ padding: '10px' }}>
                    <Alert
                        message="AI 분석 리포트"
                        description={result.recommendation}
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        style={{ marginBottom: '24px', border: '1px solid #91caff', background: '#e6f7ff' }}
                    />

                    <Row gutter={16} style={{ marginBottom: '24px' }}>
                        <Col span={8}>
                            <Card size="small">
                                <Statistic
                                    title="날씨 민감도"
                                    value={result.stats.sensitivity}
                                    precision={2}
                                    suffix="/°C"
                                    valueStyle={{ color: result.stats.sensitivity > 0 ? '#cf1322' : '#3f8600' }}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>기온 1°C 상승 시 판매량 변화</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small">
                                <Statistic
                                    title="상관계수 (r)"
                                    value={result.stats.correlation}
                                    precision={2}
                                    valueStyle={{ color: Math.abs(result.stats.correlation) > 0.5 ? '#1890ff' : '#8c8c8c' }}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>1에 가까울수록 뚜렷한 패턴</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small">
                                <Statistic
                                    title="분석 데이터"
                                    value={result.data.length}
                                    suffix="일"
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>최근 90일 기준</Text>
                            </Card>
                        </Col>
                    </Row>

                    <Title level={5}>기온 vs 판매량 산점도</Title>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    dataKey="temperature"
                                    name="기온"
                                    unit="°C"
                                    domain={['auto', 'auto']}
                                    label={{ value: '기온 (°C)', position: 'bottom', offset: 0 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="quantity"
                                    name="판매량"
                                    unit="개"
                                    allowDecimals={false}
                                    label={{ value: '판매량', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Sales" data={result.data} fill="#8884d8" opacity={0.6} />
                                {/* Trend Line */}
                                <Scatter
                                    name="Trend"
                                    data={getTrendLineData()}
                                    line={{ stroke: '#ff4d4f', strokeWidth: 2 }}
                                    shape={(() => <></>) as any}
                                    legendType="none"
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                        <Text type="secondary">
                            <span style={{ color: '#8884d8', marginRight: '10px' }}>● 일별 판매량</span>
                            <span style={{ color: '#ff4d4f' }}>― 추세선 (AI 예측 모델)</span>
                        </Text>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Text type="secondary">데이터가 없습니다.</Text>
                </div>
            )}
        </Modal>
    );
};

export default ProductAnalysis;

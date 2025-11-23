
import React, { useState, useEffect } from 'react';
import { Line } from '@ant-design/charts';
import api from '../api';
import './SalesAnalysisModal.css';

interface ProductData {
  name: string;
  quantity: number;
}

interface SalesAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  topProducts: ProductData[];
  bottomProducts: ProductData[];
}

interface AnalysisData {
  suggestion: string;
}

const SalesAnalysisModal: React.FC<SalesAnalysisModalProps> = ({ isOpen, onClose, topProducts, bottomProducts }) => {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        setAnalysis(null);
        try {
          const response = await api.get('/analytics/monthly-summary');
          // We only need the suggestion from the response now, as we have the product data from props
          setAnalysis({ suggestion: response.data.suggestion });
        } catch (err: any) {
          if (err.response && err.response.status === 404) {
            setError(err.response.data.message || '분석을 위한 데이터가 충분하지 않습니다.');
          } else {
            setError('판매 분석을 가져오는 데 실패했습니다.');
          }
          console.error(err);
        }
        setLoading(false);
      };

      fetchAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const topProductsConfig = {
    data: topProducts,
    xField: 'name',
    yField: 'quantity',
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
        stroke: '#1677ff',
        lineWidth: 2,
      },
    },
    label: {
      style: {
        fill: '#1677ff',
        opacity: 0.6,
      },
    },
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
    smooth: true,
  };

  const bottomProductsConfig = {
    data: bottomProducts,
    xField: 'name',
    yField: 'quantity',
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
        stroke: '#ff4d4f',
        lineWidth: 2,
      },
    },
    label: {
      style: {
        fill: '#ff4d4f',
        opacity: 0.6,
      },
    },
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
    smooth: true,
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <h2>월간 판매 분석 리포트</h2>
        {loading && (
          <div className="loading-container">
            <div className="loading-icon">🤖</div>
            <p className="loading-text">
              AI가 사장님을 위한<br />
              <strong>맞춤 분석 리포트</strong>를 작성 중이에요!
            </p>
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
          </div>
        )}
        {error && <p className="error-message">오류: {error}</p>}
        {!loading && (
          <div className="analysis-results">
            <div className="charts-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexDirection: 'column' }}>
              <div className="chart-wrapper">
                <h3>🚀 인기 상품 TOP 5</h3>
                <Line {...topProductsConfig} height={200} />
              </div>
              <div className="chart-wrapper">
                <h3>📉 비인기 상품 TOP 5</h3>
                <Line {...bottomProductsConfig} height={200} />
              </div>
            </div>

            {analysis && (
              <div className="ai-suggestion">
                <h3>🤖 AI의 메뉴 개선 제안</h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{analysis.suggestion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalysisModal;

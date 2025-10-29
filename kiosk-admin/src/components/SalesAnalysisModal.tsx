import React, { useState, useEffect } from 'react';
import api from '../api';
import './SalesAnalysisModal.css';

interface SalesAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalysisData {
  bestSeller: { name: string; totalQuantity: number };
  worstSeller: { name: string; totalQuantity: number };
  suggestion: string;
}

const SalesAnalysisModal: React.FC<SalesAnalysisModalProps> = ({ isOpen, onClose }) => {
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
          setAnalysis(response.data);
                   } catch (err: any) {          if (err.response && err.response.status === 404) {
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <h2>월간 판매 분석 리포트</h2>
        {loading && <p>AI가 지난 한 달간의 데이터를 분석 중입니다...</p>}
        {error && <p className="error-message">오류: {error}</p>}
        {analysis && (
          <div className="analysis-results">
            <div className="result-card best-seller">
              <h3>🚀 최고 인기 상품</h3>
              <p><strong>{analysis.bestSeller.name}</strong> ({analysis.bestSeller.totalQuantity}개 판매)</p>
            </div>
            <div className="result-card worst-seller">
              <h3>📉 최저 판매 상품</h3>
              <p><strong>{analysis.worstSeller.name}</strong> ({analysis.worstSeller.totalQuantity}개 판매)</p>
            </div>
            <div className="ai-suggestion">
              <h3>🤖 AI의 메뉴 개선 제안</h3>
              <p>{analysis.suggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesAnalysisModal;

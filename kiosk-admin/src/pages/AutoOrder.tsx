import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

interface ProductDemand {
  productId: number;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  reorderQuantity: number;
}

const AutoOrder: React.FC = () => {
  const [predictions, setPredictions] = useState<ProductDemand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await api.get<ProductDemand[]>('/predictions/demand');
        setPredictions(response.data);
      } catch (err) {
        setError('수요 예측 데이터를 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">오류: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">자동 발주 추천</h1>
      <p className="mb-4">지난 30일간의 판매 데이터를 기반으로 다음 7일간의 수요를 예측하여 발주가 필요한 상품을 추천합니다.</p>

      {predictions.length === 0 ? (
        <p>현재 발주가 필요한 상품이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">상품명</th>
                <th className="py-2 px-4 border-b text-left">현재 재고</th>
                <th className="py-2 px-4 border-b text-left">예측 수요 (7일)</th>
                <th className="py-2 px-4 border-b text-left">추천 발주 수량</th>
                <th className="py-2 px-4 border-b text-left"></th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.productId}>
                  <td className="py-2 px-4 border-b">{p.productName}</td>
                  <td className="py-2 px-4 border-b">{p.currentStock}</td>
                  <td className="py-2 px-4 border-b">{p.predictedDemand}</td>
                  <td className="py-2 px-4 border-b font-bold text-blue-600">{p.reorderQuantity}</td>
                  <td className="py-2 px-4 border-b">
                    <Link to={`/products/edit/${p.productId}`} className="text-indigo-600 hover:text-indigo-900">
                      상품 수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AutoOrder;

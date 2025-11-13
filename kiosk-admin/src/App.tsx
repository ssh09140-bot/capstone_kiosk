import CategoryList from './pages/CategoryList'; // CategoryList import 추가
import OrderList from './pages/OrderList'; // OrderList import 추가
import { Routes, Route } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyInfo from './pages/MyInfo';
import AppLayout from './components/AppLayout';
import OptionGroupList from './pages/OptionGroupList'; // 옵션 관리 경로 추가
import AutoOrder from './pages/AutoOrder'; // 자동 발주 페이지 import 추가
import PurchaseOrderList from './pages/PurchaseOrderList'; // 구매 주문 목록 import 추가
import InventoryPage from './pages/Inventory'; // InventoryPage import 추가
import InventoryForm from './pages/InventoryForm'; // InventoryForm import 추가

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="categories" element={<CategoryList />} /> {/* 카테고리 경로 추가 */}
        <Route path="orders" element={<OrderList />} /> {/* 주문 내역 경로 추가 */}
        <Route path="option-groups" element={<OptionGroupList />} /> {/* 옵션 관리 경로 추가 */}
        <Route path="auto-order" element={<AutoOrder />} /> {/* 자동 발주 경로 추가 */}
        <Route path="purchase-orders" element={<PurchaseOrderList />} /> {/* 구매 주문 목록 경로 추가 */}
        <Route path="inventory" element={<InventoryPage />} /> {/* 재고 관리 경로 추가 */}
        <Route path="inventory/new" element={<InventoryForm />} />
        <Route path="inventory/:id" element={<InventoryForm />} />
        <Route path="my-info" element={<MyInfo />} />
      </Route>
    </Routes>
  );
}

export default App;
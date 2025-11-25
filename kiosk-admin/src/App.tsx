import CategoryList from './pages/CategoryList';
import OrderList from './pages/OrderList';
import { Routes, Route } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import MyInfo from './pages/MyInfo';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import OptionGroupList from './pages/OptionGroupList';
import PurchaseOrderList from './pages/PurchaseOrderList';
import InventoryPage from './pages/Inventory';
import InventoryForm from './pages/InventoryForm';
import SupplierList from './pages/SupplierList';
import SupplierForm from './pages/SupplierForm';
import InventoryLogList from './pages/InventoryLogList';
import Reports from './pages/Reports';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="categories" element={<CategoryList />} />
        <Route path="orders" element={<OrderList />} />
        <Route path="option-groups" element={<OptionGroupList />} />
        <Route path="purchase-orders" element={<PurchaseOrderList />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/new" element={<InventoryForm />} />
        <Route path="inventory/:id" element={<InventoryForm />} />
        <Route path="inventory-logs" element={<InventoryLogList />} />
        <Route path="suppliers" element={<SupplierList />} />
        <Route path="suppliers/new" element={<SupplierForm />} />
        <Route path="suppliers/:id" element={<SupplierForm />} />
        <Route path="my-info" element={<MyInfo />} />
      </Route>
    </Routes>
  );
}

export default App;
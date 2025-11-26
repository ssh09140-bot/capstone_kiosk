import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';

// Lazy load components
const AppLayout = lazy(() => import('./components/AppLayout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const ProductList = lazy(() => import('./pages/ProductList'));
const ProductForm = lazy(() => import('./pages/ProductForm'));
const CategoryList = lazy(() => import('./pages/CategoryList'));
const OrderList = lazy(() => import('./pages/OrderList'));
const OptionGroupList = lazy(() => import('./pages/OptionGroupList'));
const PurchaseOrderList = lazy(() => import('./pages/PurchaseOrderList'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const InventoryForm = lazy(() => import('./pages/InventoryForm'));
const InventoryLogList = lazy(() => import('./pages/InventoryLogList'));
const SupplierList = lazy(() => import('./pages/SupplierList'));
const SupplierForm = lazy(() => import('./pages/SupplierForm'));
const MyInfo = lazy(() => import('./pages/MyInfo'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
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
    </Suspense>
  );
}

export default App;
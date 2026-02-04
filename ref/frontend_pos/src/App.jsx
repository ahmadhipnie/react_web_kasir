import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Foods from './pages/Foods';
import Categories from './pages/Categories';
import Transaction from './pages/Transaction';
import History from './pages/History';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('🔒 ProtectedRoute check:', { user, loading });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Memuat...</p>
      </div>
    );
  }

  if (!user) {
    console.log('❌ No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ User authenticated, rendering protected content');
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="foods" element={<Foods />} />
        <Route path="categories" element={<Categories />} />
        <Route path="transaction" element={<Transaction />} />
        <Route path="history" element={<History />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils';
import { 
  HiOutlineViewGrid, 
  HiOutlineShoppingCart, 
  HiOutlineCollection,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineLogout,
  HiOutlineCalendar
} from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: HiOutlineViewGrid },
    { name: 'Transaksi', path: '/transaction', icon: HiOutlineShoppingCart },
    { name: 'Data Makanan', path: '/foods', icon: IoFastFoodOutline },
    { name: 'Kategori', path: '/categories', icon: HiOutlineCollection },
    { name: 'History', path: '/history', icon: HiOutlineClock },
  ];

  const getPageInfo = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Ringkasan bisnis Anda hari ini' };
      case '/transaction':
        return { title: 'Transaksi Baru', subtitle: 'Buat transaksi penjualan' };
      case '/foods':
        return { title: 'Data Makanan', subtitle: 'Kelola menu makanan dan minuman' };
      case '/categories':
        return { title: 'Kategori', subtitle: 'Kelola kategori menu' };
      case '/history':
        return { title: 'History Transaksi', subtitle: 'Riwayat semua transaksi' };
      default:
        return { title: 'FoodPOS', subtitle: 'Sistem POS Modern' };
    }
  };

  const pageInfo = getPageInfo();

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🍔</div>
          <div className="sidebar-brand">
            <h1>FoodPOS</h1>
            <span>Sistem Kasir Modern</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getUserInitials(user?.nama_lengkap)}
            </div>
            <div className="user-details">
              <h4>{user?.nama_lengkap || 'User'}</h4>
              <span>{user?.role || 'Kasir'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            <HiOutlineLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h2>{pageInfo.title}</h2>
            <p>{pageInfo.subtitle}</p>
          </div>
          <div className="header-right">
            <div className="header-date">
              <HiOutlineCalendar />
              <span>{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

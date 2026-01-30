import { useState, useEffect } from 'react';
import { 
  HiOutlineCurrencyDollar, 
  HiOutlineShoppingCart, 
  HiOutlineClipboardList,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown
} from 'react-icons/hi';
import { IoFastFoodOutline } from 'react-icons/io5';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { dashboardService, transactionService } from '../services/api';
import { formatCurrency, formatNumber } from '../utils';
import { LoadingSpinner } from '../components/common';

const Dashboard = () => {
  const [summary, setSummary] = useState({
    total_pendapatan_hari_ini: 0,
    total_transaksi_hari_ini: 0,
    total_item_terjual_hari_ini: 0,
    total_makanan: 0,
  });
  const [topFoods, setTopFoods] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data
      const [summaryRes, topFoodsRes, transactionsRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTopFoods(),
        transactionService.getHistory({ limit: 5 })
      ]);

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }

      if (topFoodsRes.success) {
        setTopFoods(topFoodsRes.data || []);
      }

      if (transactionsRes.success) {
        setRecentTransactions(transactionsRes.data?.data || transactionsRes.data || []);
      }

      // Generate mock chart data (replace with real API data later)
      generateChartData();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const data = days.map((day) => ({
      name: day,
      pendapatan: Math.floor(Math.random() * 2000000) + 500000,
      transaksi: Math.floor(Math.random() * 50) + 10,
    }));
    setChartData(data);
  };

  const stats = [
    {
      title: 'Pendapatan Hari Ini',
      value: formatCurrency(summary.total_pendapatan_hari_ini || 0),
      icon: HiOutlineCurrencyDollar,
      iconClass: 'primary',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: 'Total Transaksi',
      value: formatNumber(summary.total_transaksi_hari_ini || 0),
      icon: HiOutlineShoppingCart,
      iconClass: 'success',
      change: '+8.2%',
      changeType: 'positive'
    },
    {
      title: 'Item Terjual',
      value: formatNumber(summary.total_item_terjual_hari_ini || 0),
      icon: HiOutlineClipboardList,
      iconClass: 'warning',
      change: '+15.3%',
      changeType: 'positive'
    },
    {
      title: 'Total Menu',
      value: formatNumber(summary.total_makanan || 0),
      icon: IoFastFoodOutline,
      iconClass: 'info',
      change: '0%',
      changeType: 'neutral'
    },
  ];

  const getRankClass = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Memuat data dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${stat.iconClass}`}>
              <stat.icon />
            </div>
            <div className="stat-content">
              <h3>{stat.title}</h3>
              <div className="value">{stat.value}</div>
              <div className={`change ${stat.changeType}`}>
                {stat.changeType === 'positive' ? <HiOutlineTrendingUp /> : 
                 stat.changeType === 'negative' ? <HiOutlineTrendingDown /> : null}
                <span>{stat.change} dari kemarin</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Sales Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Grafik Pendapatan Mingguan</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pendapatan" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPendapatan)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Foods */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Menu Terlaris</h3>
          </div>
          <div className="chart-body">
            <div className="top-foods-list">
              {topFoods.length > 0 ? (
                topFoods.slice(0, 5).map((food, index) => (
                  <div key={food.id || index} className="top-food-item">
                    <div className={`top-food-rank ${getRankClass(index)}`}>
                      {index + 1}
                    </div>
                    <div className="top-food-info">
                      <h4>{food.nama_makanan}</h4>
                      <span>{food.nama_kategori || 'Uncategorized'}</span>
                    </div>
                    <div className="top-food-sales">
                      {formatNumber(food.jumlah_terjual || 0)} terjual
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>
                  Belum ada data penjualan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Transaksi Terakhir</h3>
        </div>
        <div className="card-body">
          {recentTransactions.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode Transaksi</th>
                    <th>Tanggal</th>
                    <th>Total Item</th>
                    <th>Total Bayar</th>
                    <th>Pembayaran</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((trx) => (
                    <tr key={trx.id}>
                      <td>
                        <strong>{trx.kode_transaksi}</strong>
                      </td>
                      <td>{new Date(trx.tanggal_transaksi).toLocaleDateString('id-ID')}</td>
                      <td>{trx.total_item} item</td>
                      <td>{formatCurrency(trx.total_bayar)}</td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                          {trx.metode_pembayaran}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${trx.status === 'selesai' ? 'badge-success' : 'badge-warning'}`}>
                          {trx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>
              Belum ada transaksi hari ini
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

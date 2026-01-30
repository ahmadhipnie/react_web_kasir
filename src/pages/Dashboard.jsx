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
import { dashboardService, transactionService, foodService } from '../services/api';
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

      // summaryRes may be either { success, data: { summary: {...}, ... } }
      // or older { success, data: {...summary fields...} }
      if (summaryRes.success) {
        const data = summaryRes.data || {};
        const resolvedSummary = data.summary || data;
        setSummary(resolvedSummary || {});

        // monthly_sales may be nested under data.monthly_sales or not present
        if (data.monthly_sales && Array.isArray(data.monthly_sales) && data.monthly_sales.length > 0) {
          const chart = data.monthly_sales.map(m => ({ name: m.month_name, pendapatan: Number(m.total_pendapatan || 0), transaksi: Number(m.total_transaksi || 0) }));
          setChartData(chart);
        } else {
          // fallback: aggregate recent transactions for last 7 days
          try {
            const today = new Date();
            const start = new Date();
            start.setDate(today.getDate() - 6);
            const toISO = d => d.toISOString().split('T')[0];
            const trxRes = await transactionService.getAll({ start_date: toISO(start), end_date: toISO(today) });
            
            if (trxRes && trxRes.success) {
              const trxList = trxRes.data?.data || trxRes.data || [];
              console.log('📊 Fallback grafik - transaksi 7 hari:', trxList.length);
              
              const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
              const dayMap = {};
              
              // Initialize 7 days
              for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dateKey = toISO(d);
                dayMap[dateKey] = { name: dayNames[d.getDay()], pendapatan: 0, transaksi: 0 };
              }
              
              // Aggregate transactions by date
              trxList.forEach(t => {
                const date = (new Date(t.tanggal_transaksi)).toISOString().split('T')[0];
                if (dayMap[date]) {
                  dayMap[date].pendapatan += Number(t.total_bayar || 0);
                  dayMap[date].transaksi += 1;
                }
              });
              
              const chart = Object.values(dayMap);
              console.log('📊 Data grafik fallback:', chart);
              setChartData(chart);
            } else {
              console.log('⚠️ Gagal fetch transaksi untuk grafik');
              setChartData([]);
            }
          } catch (err) {
            console.error('❌ Error fallback grafik:', err);
            setChartData([]);
          }
        }

      // If total_makanan not provided, fetch count from foods
      if (!resolvedSummary.total_makanan || resolvedSummary.total_makanan === 0) {
        try {
          const foodsRes = await foodService.getAll();
          if (foodsRes && foodsRes.success) {
            const foodsList = foodsRes.data || foodsRes.data?.data || [];
            setSummary(prev => ({ ...prev, total_makanan: foodsList.length }));
          }
        } catch (err) {
          // ignore
        }
      }
      }

      // top foods
      if (topFoodsRes && topFoodsRes.success) {
        // topFoodsRes may return data directly or nested
        setTopFoods(topFoodsRes.data || topFoodsRes.data?.data || []);
      }

      // recent transactions - try to get from summary response first (new API), otherwise fallback to transactionsRes
      if (summaryRes.success && summaryRes.data && summaryRes.data.recent_transactions) {
        setRecentTransactions(summaryRes.data.recent_transactions || []);
      } else if (transactionsRes && transactionsRes.success) {
        setRecentTransactions(transactionsRes.data?.data || transactionsRes.data || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Pendapatan Hari Ini',
      value: formatCurrency(summary.total_pendapatan_hari_ini || 0),
      icon: HiOutlineCurrencyDollar,
      iconClass: 'primary',
      changeType: 'neutral'
    },
    {
      title: 'Total Transaksi',
      value: formatNumber(summary.total_transaksi_hari_ini || 0),
      icon: HiOutlineShoppingCart,
      iconClass: 'success',
      changeType: 'neutral'
    },
    {
      title: 'Item Terjual',
      value: formatNumber(summary.total_item_terjual_hari_ini || 0),
      icon: HiOutlineClipboardList,
      iconClass: 'warning',
      changeType: 'neutral'
    },
    {
      title: 'Total Menu',
      value: formatNumber(summary.total_makanan || 0),
      icon: IoFastFoodOutline,
      iconClass: 'info',
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

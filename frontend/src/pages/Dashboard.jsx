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
import { formatCurrency, formatNumber, formatDateTime } from '../utils';
import { LoadingSpinner } from '../components/common';

const Dashboard = () => {
  const [summary, setSummary] = useState({
    today_revenue: 0,
    today_transactions: 0,
    today_items_sold: 0,
    total_foods: 0,
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
      
      const [summaryRes, topFoodsRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getTopFoods()
      ]);

      if (summaryRes.success) {
        const data = summaryRes.data || {};
        setSummary(data.summary || {});
        
        // Set chart data from weekly_sales
        if (data.weekly_sales && data.weekly_sales.length > 0) {
          const chart = data.weekly_sales.map(item => ({
            name: item.day_name?.substring(0, 3) || item.date,
            revenue: Number(item.total_revenue || 0),
            transactions: Number(item.total_transactions || 0)
          }));
          setChartData(chart);
        }

        // Set recent transactions
        if (data.recent_transactions) {
          setRecentTransactions(data.recent_transactions);
        }
      }

      if (topFoodsRes && topFoodsRes.success) {
        setTopFoods(topFoodsRes.data || []);
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
      title: "Today's Revenue",
      value: formatCurrency(summary.today_revenue || 0),
      icon: HiOutlineCurrencyDollar,
      iconClass: 'primary',
      changeType: 'neutral'
    },
    {
      title: 'Total Transactions',
      value: formatNumber(summary.today_transactions || 0),
      icon: HiOutlineShoppingCart,
      iconClass: 'success',
      changeType: 'neutral'
    },
    {
      title: 'Items Sold',
      value: formatNumber(summary.today_items_sold || 0),
      icon: HiOutlineClipboardList,
      iconClass: 'warning',
      changeType: 'neutral'
    },
    {
      title: 'Total Menu',
      value: formatNumber(summary.total_foods || 0),
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { class: 'badge-success', label: 'Completed' },
      'cancelled': { class: 'badge-danger', label: 'Cancelled' },
      'pending': { class: 'badge-warning', label: 'Pending' }
    };
    const statusInfo = statusMap[status] || { class: 'badge-info', label: status };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading dashboard data..." />;
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
            <h3>Weekly Revenue Chart</h3>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`}
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
                  dataKey="revenue" 
                  name="Revenue"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Foods */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Best Selling Menu</h3>
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
                      <h4>{food.food_name}</h4>
                      <span>{food.category_name || 'Uncategorized'}</span>
                    </div>
                    <div className="top-food-sales">
                      {formatNumber(food.quantity_sold || 0)} sold
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>
                  No sales data yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Recent Transactions</h3>
        </div>
        <div className="card-body">
          {recentTransactions.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction Code</th>
                    <th>Date</th>
                    <th>Total Items</th>
                    <th>Total Payment</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((trx) => (
                    <tr key={trx.id}>
                      <td><strong>{trx.transaction_code}</strong></td>
                      <td>{formatDateTime(trx.transaction_date)}</td>
                      <td>{trx.total_item} items</td>
                      <td><strong>{formatCurrency(trx.total_payment)}</strong></td>
                      <td style={{ textTransform: 'capitalize' }}>{trx.payment_method}</td>
                      <td>{getStatusBadge(trx.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '2rem' }}>
              No transactions yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

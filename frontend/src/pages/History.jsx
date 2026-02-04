import { useState, useEffect, useCallback } from 'react';
import { 
  HiOutlineSearch, 
  HiOutlineFilter,
  HiOutlineDocumentDownload,
  HiOutlineEye,
  HiOutlineX,
  HiOutlineCalendar
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { transactionService } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { LoadingSpinner, EmptyState, Pagination, Modal } from '../components/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10
      };
      
      if (searchQuery) params.search = searchQuery;
      if (filterPayment !== 'all') params.payment_method = filterPayment;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await transactionService.getAll(params);
      
      if (response.success) {
        setTransactions(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterPayment, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilter = () => {
    setShowFilter(!showFilter);
  };

  const applyFilter = () => {
    setCurrentPage(1);
    setShowFilter(false);
    fetchTransactions();
  };

  const resetFilter = () => {
    setFilterPayment('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setShowFilter(false);
  };

  const handleViewDetail = async (transaction) => {
    try {
      setDetailLoading(true);
      setDetailModal(true);
      
      const response = await transactionService.getById(transaction.id);
      
      if (response.success) {
        setSelectedTransaction(response.data);
      } else {
        toast.error('Failed to load transaction details');
        setDetailModal(false);
      }
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
      toast.error('Failed to load transaction details');
      setDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Fetch all transactions for export
      const params = {};
      if (filterPayment !== 'all') params.payment_method = filterPayment;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      params.limit = 1000; // Get all for export

      const response = await transactionService.getAll(params);
      
      if (!response.success || !response.data?.length) {
        toast.error('No data to export');
        return;
      }

      // Format data for Excel
      const exportData = response.data.map((trx, index) => ({
        'No': index + 1,
        'Transaction Code': trx.transaction_code,
        'Date': formatDateTime(trx.transaction_date),
        'Cashier': trx.full_name || 'Unknown',
        'Total Items': trx.total_item,
        'Subtotal': trx.subtotal,
        'Tax': trx.tax,
        'Discount': trx.discount,
        'Total': trx.total_payment,
        'Cash Received': trx.money_received,
        'Change': trx.change_money,
        'Payment Method': trx.payment_method?.toUpperCase(),
        'Notes': trx.notes || '-'
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Generate file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      const filename = `transactions_${formatDate(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      saveAs(data, filename);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getPaymentBadgeClass = (method) => {
    switch (method) {
      case 'cash': return 'badge-success';
      case 'debit': return 'badge-primary';
      case 'credit': return 'badge-warning';
      case 'qris': return 'badge-purple';
      default: return 'badge-gray';
    }
  };

  if (loading && transactions.length === 0) {
    return <LoadingSpinner size="lg" message="Loading transactions..." />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transaction History</h1>
          <p>View and manage all transactions</p>
        </div>
        <button 
          className="btn btn-outline"
          onClick={handleExport}
          disabled={exporting}
        >
          <HiOutlineDocumentDownload />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-input" style={{ flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by transaction code..."
                value={searchQuery}
                onChange={handleSearch}
              />
              <HiOutlineSearch className="search-icon" />
            </div>

            <button 
              className={`btn btn-outline ${showFilter ? 'active' : ''}`}
              onClick={handleFilter}
            >
              <HiOutlineFilter />
              Filter
            </button>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <div className="filter-panel" style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'flex-end'
            }}>
              <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                <label className="form-label">Start Date</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                <label className="form-label">End Date</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={applyFilter}>
                  Apply
                </button>
                <button className="btn btn-ghost btn-sm" onClick={resetFilter}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="card-body">
          {transactions.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Transaction Code</th>
                      <th>Date</th>
                      <th>Cashier</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((trx) => (
                      <tr key={trx.id}>
                        <td>
                          <strong>{trx.transaction_code}</strong>
                        </td>
                        <td>{formatDateTime(trx.transaction_date)}</td>
                        <td>{trx.full_name || 'Unknown'}</td>
                        <td>{trx.total_item} items</td>
                        <td>
                          <strong>{formatCurrency(trx.total_payment)}</strong>
                        </td>
                        <td>
                          <span className={`badge ${getPaymentBadgeClass(trx.payment_method)}`}>
                            {trx.payment_method?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleViewDetail(trx)}
                            title="View Details"
                          >
                            <HiOutlineEye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={<HiOutlineCalendar />}
              title="No Transactions"
              description="No transactions found matching your criteria"
            />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModal}
        onClose={() => {
          setDetailModal(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
        size="lg"
      >
        {detailLoading ? (
          <LoadingSpinner message="Loading details..." />
        ) : selectedTransaction ? (
          <div className="transaction-detail">
            {/* Header Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Transaction Code</span>
                <p style={{ fontWeight: '600' }}>{selectedTransaction.transaction_code}</p>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Date</span>
                <p style={{ fontWeight: '600' }}>{formatDateTime(selectedTransaction.transaction_date)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Cashier</span>
                <p style={{ fontWeight: '600' }}>{selectedTransaction.full_name || 'Unknown'}</p>
              </div>
              <div>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Payment</span>
                <p>
                  <span className={`badge ${getPaymentBadgeClass(selectedTransaction.payment_method)}`}>
                    {selectedTransaction.payment_method?.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <h4 style={{ marginBottom: '1rem' }}>Order Items</h4>
            <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.food_name}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div style={{
              borderTop: '1px solid var(--gray-200)',
              paddingTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(selectedTransaction.subtotal)}</span>
              </div>
              {selectedTransaction.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--danger-500)' }}>
                  <span>Discount</span>
                  <span>-{formatCurrency(selectedTransaction.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Tax</span>
                <span>{formatCurrency(selectedTransaction.tax)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '0.5rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                paddingTop: '0.5rem',
                borderTop: '2px solid var(--gray-900)'
              }}>
                <span>Total</span>
                <span>{formatCurrency(selectedTransaction.total_payment)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Cash Received</span>
                <span>{formatCurrency(selectedTransaction.money_received)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-600)', fontWeight: '600' }}>
                <span>Change</span>
                <span>{formatCurrency(selectedTransaction.change_money)}</span>
              </div>
            </div>

            {selectedTransaction.notes && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-md)'
              }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Notes:</span>
                <p>{selectedTransaction.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default History;

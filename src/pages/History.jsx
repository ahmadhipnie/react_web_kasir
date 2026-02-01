import { useState, useEffect } from 'react';
import { 
  HiOutlineSearch, 
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineCalendar
} from 'react-icons/hi';
import { IoReceiptOutline } from 'react-icons/io5';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { transactionService } from '../services/api';
import { formatCurrency, formatDateTime, getCurrentDateForInput, getStartOfMonthForInput } from '../utils';
import { Modal, LoadingSpinner, EmptyState, Pagination } from '../components/common';

const History = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(getStartOfMonthForInput());
  const [endDate, setEndDate] = useState(getCurrentDateForInput());
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, startDate, endDate, statusFilter, searchQuery]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: itemsPerPage,
        start_date: startDate,
        end_date: endDate,
        search: searchQuery,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await transactionService.getHistory(params);

      if (response.success) {
        const data = response.data;
        setTransactions(data.data || data);
        setTotalPages(data.last_page || 1);
        setTotalItems(data.total || data.length);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  const viewTransactionDetail = async (transaction) => {
    try {
      setLoadingDetail(true);
      setIsDetailOpen(true);
      
      const response = await transactionService.getById(transaction.id);
      
      if (response.success) {
        setSelectedTransaction(response.data);
      } else {
        setSelectedTransaction(transaction);
      }
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
      setSelectedTransaction(transaction);
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const exportData = transactions.map((trx, index) => ({
        'No': index + 1,
        'Transaction Code': trx.kode_transaksi,
        'Date': formatDateTime(trx.tanggal_transaksi),
        'Cashier': trx.kasir || trx.user?.nama_lengkap || '-',
        'Total Items': trx.total_item,
        'Subtotal': trx.subtotal,
        'Tax': trx.pajak,
        'Discount': trx.diskon,
        'Total Payment': trx.total_bayar,
        'Payment Method': trx.metode_pembayaran,
        'Status': trx.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

      // Style column widths
      worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 18 },  // Kode
        { wch: 20 },  // Tanggal
        { wch: 15 },  // Kasir
        { wch: 10 },  // Total Item
        { wch: 15 },  // Subtotal
        { wch: 12 },  // Pajak
        { wch: 12 },  // Diskon
        { wch: 15 },  // Total Bayar
        { wch: 15 },  // Metode
        { wch: 10 },  // Status
      ];

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `transactions_${startDate}_${endDate}.xlsx`;
      saveAs(data, fileName);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export data');
    }
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

  return (
    <div>
      {/* Filters */}
      <div className="history-filters">
        <div className="search-input" style={{ flex: 1, maxWidth: '300px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search transaction code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <HiOutlineSearch className="search-icon" />
        </div>

        <div className="date-filter">
          <HiOutlineCalendar />
          <label>From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="date-filter">
          <label>To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* <select 
          className="form-select" 
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Semua Status</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select> */}

        <button className="btn btn-success" onClick={exportToExcel}>
          <HiOutlineDownload />
          Export Excel
        </button>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <LoadingSpinner message="Loading transaction data..." />
      ) : transactions.length > 0 ? (
        <div className="history-table">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Transaction Code</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Total Items</th>
                  <th>Total Payment</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((trx) => (
                  <tr key={trx.id}>
                    <td>
                      <strong>{trx.kode_transaksi}</strong>
                    </td>
                    <td>{formatDateTime(trx.tanggal_transaksi)}</td>
                    <td>{trx.kasir || trx.user?.nama_lengkap || '-'}</td>
                    <td>{trx.total_item} items</td>
                    <td>
                      <strong>{formatCurrency(trx.total_bayar)}</strong>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                        {trx.metode_pembayaran}
                      </span>
                    </td>
                    <td>{getStatusBadge(trx.status)}</td>
                    <td>
                      <button 
                        className="btn btn-icon btn-secondary sm"
                        onClick={() => viewTransactionDetail(trx)}
                        title="View Detail"
                      >
                        <HiOutlineEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '1rem 1.5rem' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      ) : (
        <div className="history-table">
          <EmptyState
            icon={IoReceiptOutline}
            title="No transactions yet"
            description="Transactions will appear here after a sale is made"
          />
        </div>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Detail"
        size="lg"
      >
        {loadingDetail ? (
          <LoadingSpinner message="Loading detail..." />
        ) : selectedTransaction ? (
          <div className="transaction-detail-modal">
            <div className="transaction-info">
              <div className="transaction-info-item">
                <label>Transaction Code</label>
                <span>{selectedTransaction.kode_transaksi}</span>
              </div>
              <div className="transaction-info-item">
                <label>Date</label>
                <span>{formatDateTime(selectedTransaction.tanggal_transaksi)}</span>
              </div>
              <div className="transaction-info-item">
                <label>Cashier</label>
                <span>{selectedTransaction.kasir || selectedTransaction.user?.nama_lengkap || '-'}</span>
              </div>
              <div className="transaction-info-item">
                <label>Payment Method</label>
                <span style={{ textTransform: 'capitalize' }}>{selectedTransaction.metode_pembayaran}</span>
              </div>
            </div>

            <div className="transaction-items">
              <h4>Order Items</h4>
              {selectedTransaction.details?.length > 0 ? (
                selectedTransaction.details.map((item, index) => (
                  <div key={index} className="transaction-item">
                    <div className="transaction-item-left">
                      <span className="transaction-item-name">{item.nama_makanan || item.food_nama}</span>
                      <span className="transaction-item-qty">
                        {item.jumlah} x {formatCurrency(item.harga_satuan || item.harga)}
                      </span>
                    </div>
                    <span className="transaction-item-price">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--gray-400)', padding: '1rem 0' }}>
                  Item details not available
                </p>
              )}
            </div>

            <div className="transaction-totals">
              <div className="transaction-total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedTransaction.subtotal)}</span>
              </div>
              {selectedTransaction.diskon > 0 && (
                <div className="transaction-total-row" style={{ color: 'var(--danger-500)' }}>
                  <span>Discount</span>
                  <span>-{formatCurrency(selectedTransaction.diskon)}</span>
                </div>
              )}
              <div className="transaction-total-row">
                <span>Tax</span>
                <span>{formatCurrency(selectedTransaction.pajak && selectedTransaction.pajak > 0 ? selectedTransaction.pajak : Math.round((selectedTransaction.subtotal || 0) * 0.1))}</span>
              </div>
              <div className="transaction-total-row grand-total">
                <span>Total Payment</span>
                <span>{formatCurrency(selectedTransaction.total_bayar)}</span>
              </div>
              {selectedTransaction.metode_pembayaran === 'cash' && (
                <>
                  <div className="transaction-total-row">
                    <span>Cash Received</span>
                    <span>{formatCurrency(selectedTransaction.uang_diterima)}</span>
                  </div>
                  <div className="transaction-total-row">
                    <span>Change</span>
                    <span>{formatCurrency(selectedTransaction.uang_kembalian)}</span>
                  </div>
                </>
              )}
            </div>

            {selectedTransaction.catatan && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                <strong>Note:</strong>
                <p style={{ marginTop: '0.25rem' }}>{selectedTransaction.catatan}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default History;

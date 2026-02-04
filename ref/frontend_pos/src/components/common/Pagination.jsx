import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showInfo = true,
  totalItems = 0,
  itemsPerPage = 10
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      marginTop: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {showInfo && totalItems > 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
          Showing {startItem} - {endItem} of {totalItems} items
        </p>
      )}
      
      <div className="pagination">
        <button 
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <HiChevronLeft />
        </button>
        
        {getPageNumbers().map((page) => (
          <button
            key={page}
            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        
        <button 
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <HiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

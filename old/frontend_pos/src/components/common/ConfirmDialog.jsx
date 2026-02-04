import { HiExclamation, HiTrash, HiCheck } from 'react-icons/hi';

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirmation',
  message = 'Are you sure?',
  confirmText = 'Yes, Continue',
  cancelText = 'Cancel',
  type = 'warning', // warning, danger, success
  loading = false
}) => {
  if (!isOpen) return null;

  const iconMap = {
    warning: <HiExclamation />,
    danger: <HiTrash />,
    success: <HiCheck />,
  };

  const buttonClassMap = {
    warning: 'btn-warning',
    danger: 'btn-danger',
    success: 'btn-success',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <div className="confirm-modal">
            <div className={`confirm-icon ${type}`}>
              {iconMap[type]}
            </div>
            <h3>{title}</h3>
            <p>{message}</p>
            <div className="confirm-actions">
              <button 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                {cancelText}
              </button>
              <button 
                className={`btn ${buttonClassMap[type]}`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

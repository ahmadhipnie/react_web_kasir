import { HiOutlineInbox } from 'react-icons/hi';

const EmptyState = ({ 
  icon: Icon = HiOutlineInbox, 
  title = 'Data not found',
  description = 'No data available yet',
  action = null 
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <div style={{ marginTop: '1.5rem' }}>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

import { HiOutlineInbox } from 'react-icons/hi';

const EmptyState = ({ 
  icon: Icon = HiOutlineInbox, 
  title = 'No Data Found',
  description = 'No data available yet',
  action = null 
}) => {
  // Handle both component and JSX element passed as icon
  const renderIcon = () => {
    if (!Icon) return <HiOutlineInbox />;
    // If Icon is a valid React element (JSX), render it directly
    if (typeof Icon === 'object' && Icon.$$typeof) {
      return Icon;
    }
    // If Icon is a component, render it as a component
    return <Icon />;
  };

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {renderIcon()}
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

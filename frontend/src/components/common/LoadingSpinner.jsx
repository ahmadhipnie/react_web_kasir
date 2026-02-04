const LoadingSpinner = ({ size = 'md', message = '' }) => {
  const sizeClasses = {
    sm: { width: '24px', height: '24px', borderWidth: '2px' },
    md: { width: '40px', height: '40px', borderWidth: '3px' },
    lg: { width: '60px', height: '60px', borderWidth: '4px' },
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      gap: '1rem'
    }}>
      <div 
        className="loading-spinner" 
        style={{
          ...sizeClasses[size],
          border: `${sizeClasses[size].borderWidth} solid var(--gray-200)`,
          borderTopColor: 'var(--primary-600)',
        }}
      />
      {message && (
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

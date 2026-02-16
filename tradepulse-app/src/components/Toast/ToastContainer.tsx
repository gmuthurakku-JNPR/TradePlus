/**
 * Toast Component
 * Displays notification toasts
 */

import { useToast, type Toast } from '@contexts/ToastContext';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '400px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          style={getToastStyle(toast.type)}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0',
                pointerEvents: 'auto',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getToastStyle(type: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    pointerEvents: 'auto',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    animation: 'slideIn 0.3s ease-out',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid',
  };

  const typeStyles: { [key: string]: React.CSSProperties } = {
    success: {
      backgroundColor: '#10b98144',
      color: '#065f46',
      borderColor: '#10b981',
    },
    error: {
      backgroundColor: '#ef444444',
      color: '#7f1d1d',
      borderColor: '#ef4444',
    },
    warning: {
      backgroundColor: '#f5951644',
      color: '#78350f',
      borderColor: '#f59516',
    },
    info: {
      backgroundColor: '#3b82f644',
      color: '#1e3a8a',
      borderColor: '#3b82f6',
    },
  };

  return {
    ...baseStyle,
    ...(typeStyles[type] || typeStyles.info),
  };
}

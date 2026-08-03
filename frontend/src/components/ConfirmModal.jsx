import { useState } from 'react';

/**
 * Reusable Confirmation Modal — replaces window.confirm() throughout the app.
 *
 * Props:
 *   isOpen        — boolean
 *   title         — string (e.g. "Delete Customer?")
 *   message       — string (e.g. "This action cannot be undone.")
 *   confirmLabel  — string (default "Confirm")
 *   variant       — 'danger' | 'primary' (default 'danger')
 *   onConfirm     — async () => void  (called on confirm click; can be async)
 *   onCancel      — () => void
 */
function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const btnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
        <div className="text-4xl mb-3">{variant === 'danger' ? '⚠️' : 'ℹ️'}</div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        {message && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition disabled:opacity-60 flex items-center gap-2 ${btnClass}`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

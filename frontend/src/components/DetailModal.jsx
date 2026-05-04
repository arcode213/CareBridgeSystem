import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable slide-over / modal for showing detail views.
 * Props:
 *  - isOpen: bool
 *  - onClose: fn
 *  - title: string
 *  - subtitle: string (optional)
 *  - children: content
 *  - wide: bool (uses wider panel, default false)
 */
const DetailModal = ({ isOpen, onClose, title, subtitle, children, wide = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative flex flex-col bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right-8 duration-300 ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DetailModal;

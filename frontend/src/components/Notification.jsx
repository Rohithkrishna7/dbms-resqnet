import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export function NotificationBanner({ type = 'error', message, onClose, actionText, onAction }) {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'bg-rose-950/80 border-rose-800 text-rose-200',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
      btn: 'bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700'
    },
    warning: {
      bg: 'bg-amber-950/80 border-amber-800 text-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-400',
      btn: 'bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-700'
    },
    success: {
      bg: 'bg-emerald-950/80 border-emerald-800 text-emerald-200',
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
      btn: 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700'
    },
    info: {
      bg: 'bg-sky-950/80 border-sky-800 text-sky-200',
      icon: Info,
      iconColor: 'text-sky-400',
      btn: 'bg-sky-900 hover:bg-sky-800 text-sky-100 border border-sky-700'
    }
  };

  const current = styles[type] || styles.error;
  const Icon = current.icon;

  return (
    <div className={`p-4 rounded-xl border ${current.bg} flex items-start justify-between gap-3 shadow-lg my-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${current.iconColor}`} />
        <div>
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actionText && onAction && (
          <button
            onClick={onAction}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${current.btn}`}
          >
            {actionText}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

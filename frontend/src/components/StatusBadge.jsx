import React from 'react';

export function StatusBadge({ status, type = 'status' }) {
  if (!status) return null;

  const text = String(status).trim();
  const lower = text.toLowerCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (type === 'severity' || type === 'priority') {
    if (lower === 'critical' || lower === 'high') {
      colorClasses = 'bg-rose-950/70 text-rose-300 border-rose-800/60 shadow-sm shadow-rose-950';
    } else if (lower === 'medium') {
      colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-800/60 shadow-sm shadow-amber-950';
    } else if (lower === 'low') {
      colorClasses = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-950';
    }
  } else {
    // General statuses
    if (lower === 'active' || lower === 'ongoing' || lower === 'available' || lower === 'resolved' || lower === 'completed') {
      colorClasses = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-950';
    } else if (lower === 'pending' || lower === 'unassigned' || lower === 'assigned') {
      colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-800/60 shadow-sm shadow-amber-950';
    } else if (lower === 'in progress' || lower === 'deployed') {
      colorClasses = 'bg-sky-950/70 text-sky-300 border-sky-800/60 shadow-sm shadow-sky-950';
    } else if (lower === 'cancelled' || lower === 'closed' || lower === 'unavailable') {
      colorClasses = 'bg-slate-800/80 text-slate-400 border-slate-700';
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></span>
      {text}
    </span>
  );
}

export function StockBadge({ quantity, isLowStock, threshold = 25 }) {
  if (isLowStock) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/70 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
        LOW STOCK ({quantity} ≤ {threshold})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
      Adequate ({quantity})
    </span>
  );
}

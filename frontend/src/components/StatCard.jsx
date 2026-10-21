import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'teal', trend }) {
  const colorStyles = {
    teal: {
      border: 'hover:border-teal-500/50',
      iconBg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
      glow: 'hover:shadow-[0_0_20px_-3px_rgba(20,184,166,0.2)]'
    },
    rose: {
      border: 'hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      glow: 'hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.2)]'
    },
    amber: {
      border: 'hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      glow: 'hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.2)]'
    },
    indigo: {
      border: 'hover:border-indigo-500/50',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      glow: 'hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.2)]'
    },
    cyan: {
      border: 'hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      glow: 'hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.2)]'
    }
  };

  const style = colorStyles[color] || colorStyles.teal;

  return (
    <div className={`glass-panel p-5 rounded-xl border border-slate-800 transition-all duration-200 ${style.border} ${style.glow}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{value ?? 0}</span>
            {trend && <span className="text-xs text-slate-400 font-medium">{trend}</span>}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${style.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  LifeBuoy, 
  Users, 
  Boxes, 
  RefreshCw, 
  ArrowUpRight, 
  AlertTriangle,
  Clock,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { NotificationBanner } from '../components/Notification';

const CHART_COLORS = ['#14b8a6', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export function Dashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    stats: {
      activeDisasters: 0,
      totalDisasters: 0,
      pendingRequests: 0,
      totalRequests: 0,
      availableVolunteers: 0,
      totalVolunteers: 0,
      totalInventoryQuantity: 0,
      totalInventoryItems: 0,
    },
    recentRequests: [],
    charts: {
      disasterTypes: [],
      requestStatuses: [],
      inventoryCategories: [],
    },
    entityCounts: {}
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch live dashboard data from Neo4j');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Disaster Operations Command</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time graph metrics from Neo4j AuraDB disaster coordination network
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {error && (
        <NotificationBanner
          type="warning"
          message={error}
          actionText="Retry"
          onAction={loadData}
        />
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Disasters"
          value={data.stats.activeDisasters}
          subtitle={`Out of ${data.stats.totalDisasters} total incidents`}
          icon={Flame}
          color="rose"
        />
        <StatCard
          title="Pending Requests"
          value={data.stats.pendingRequests}
          subtitle={`Out of ${data.stats.totalRequests} emergency requests`}
          icon={LifeBuoy}
          color="amber"
        />
        <StatCard
          title="Available Volunteers"
          value={data.stats.availableVolunteers}
          subtitle={`Out of ${data.stats.totalVolunteers} registered personnel`}
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Total Relief Inventory"
          value={data.stats.totalInventoryQuantity}
          subtitle={`Across ${data.stats.totalInventoryItems} tracked resources`}
          icon={Boxes}
          color="teal"
        />
      </div>

      {/* 9-Entity Graph Schema Counts Overview */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Neo4j Graph Database Entities Overview (9 Core Labels)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Live Node Count</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
          {[
            { label: 'ROLE', count: data.entityCounts.ROLE ?? 0, color: 'text-purple-400' },
            { label: 'USER', count: data.entityCounts.USER ?? 0, color: 'text-blue-400' },
            { label: 'LOCATION', count: data.entityCounts.LOCATION ?? 0, color: 'text-emerald-400' },
            { label: 'DISASTER', count: data.entityCounts.DISASTER ?? 0, color: 'text-rose-400' },
            { label: 'EMERGENCY_REQUEST', count: data.entityCounts.EMERGENCY_REQUEST ?? 0, color: 'text-amber-400' },
            { label: 'VOLUNTEER', count: data.entityCounts.VOLUNTEER ?? 0, color: 'text-cyan-400' },
            { label: 'ASSIGNMENT', count: data.entityCounts.ASSIGNMENT ?? 0, color: 'text-yellow-400' },
            { label: 'RESOURCE', count: data.entityCounts.RESOURCE ?? 0, color: 'text-pink-400' },
            { label: 'INVENTORY', count: data.entityCounts.INVENTORY ?? 0, color: 'text-indigo-400' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
              <p className={`text-lg font-black ${item.color}`}>{item.count}</p>
              <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5" title={item.label}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Disaster Types Bar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-1">Disaster Distribution by Type</h3>
          <p className="text-xs text-slate-400 mb-4">Incidents categorised by disaster nature</p>
          <div className="h-64 w-full flex-1">
            {data.charts.disasterTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.disasterTypes} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis 
                    dataKey="type" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f43f5e', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No disaster records available
              </div>
            )}
          </div>
        </div>

        {/* Request Status Breakdown Pie Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-1">Emergency Requests Status</h3>
          <p className="text-xs text-slate-400 mb-4">Pending, In Progress, & Resolved requests</p>
          <div className="h-64 w-full flex-1">
            {data.charts.requestStatuses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.requestStatuses}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {data.charts.requestStatuses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No request status data available
              </div>
            )}
          </div>
        </div>

        {/* Inventory Stock by Resource Category */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-1">Relief Inventory by Category</h3>
          <p className="text-xs text-slate-400 mb-4">Stock quantities across supply types</p>
          <div className="h-64 w-full flex-1">
            {data.charts.inventoryCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.inventoryCategories} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <XAxis 
                    dataKey="category" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#14b8a6', fontSize: '12px' }}
                  />
                  <Bar dataKey="totalQuantity" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No inventory categories available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Emergency Requests Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recent Emergency Requests</h3>
            <p className="text-xs text-slate-400">Incoming civilian distress alerts and relief requisitions</p>
          </div>
          <button
            onClick={() => onNavigate('requests')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
          >
            View All Requests <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Type & Details</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Disaster</th>
                <th className="py-3 px-4">Requester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.recentRequests.length > 0 ? (
                data.recentRequests.map((req) => (
                  <tr key={req.RequestID} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">
                      {req.RequestID}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{req.Type}</div>
                      {req.Description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {req.Description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.Priority} type="priority" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.Status} type="status" />
                    </td>
                    <td className="py-3 px-4 flex items-center gap-1.5 text-slate-300 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {req.LocationName || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] font-medium text-slate-300">
                        {req.DisasterName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-medium">
                      {req.RequesterName}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No emergency requests found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

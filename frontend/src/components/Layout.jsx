import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Flame, 
  LifeBuoy, 
  Users, 
  ClipboardList, 
  Boxes, 
  Share2, 
  Database, 
  RefreshCw, 
  HelpCircle, 
  Menu, 
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from './Modal';

export function Layout({ currentTab, setTab, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({ loading: true, connected: false, message: '', totalNodes: 0 });
  const [checkingConn, setCheckingConn] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  const checkHealth = async () => {
    setCheckingConn(true);
    try {
      const data = await api.getHealth();
      setDbStatus({
        loading: false,
        connected: data.database === 'connected',
        message: data.message || '',
        totalNodes: data.totalNodes || 0,
        address: data.databaseAddress || '',
        agent: data.databaseAgent || ''
      });
    } catch (err) {
      setDbStatus({
        loading: false,
        connected: false,
        message: err.message || 'Cannot reach backend server',
        totalNodes: 0
      });
    } finally {
      setCheckingConn(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'disasters', label: 'Disaster Management', icon: Flame },
    { id: 'requests', label: 'Emergency Requests', icon: LifeBuoy },
    { id: 'volunteers', label: 'Volunteers', icon: Users },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'inventory', label: 'Relief Inventory', icon: Boxes },
    { id: 'graph', label: 'Graph Explorer', icon: Share2 },
    { id: 'queries', label: 'Advanced Queries', icon: Sparkles },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-slate-950 font-black">
              <ShieldAlert className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                ResQNet
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  NEO4J
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Disaster Response & Resource DBMS</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  active
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Neo4j Info Box */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold text-slate-300">AuraDB Status</span>
              </div>
              <button
                onClick={checkHealth}
                disabled={checkingConn}
                title="Refresh database connectivity"
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingConn ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-medium text-slate-200">
                {dbStatus.connected ? 'AuraDB Connected' : 'Database Offline'}
              </span>
            </div>
            {dbStatus.connected ? (
              <p className="mt-1 text-[11px] text-slate-400">
                {dbStatus.totalNodes} live graph nodes indexed
              </p>
            ) : (
              <button
                onClick={() => setHelpModalOpen(true)}
                className="mt-1.5 text-[11px] text-teal-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <HelpCircle className="w-3 h-3" /> Configure .env credentials
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white capitalize">
                {navItems.find(i => i.id === currentTab)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database Pill */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              dbStatus.connected 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              {dbStatus.connected ? `Neo4j AuraDB (${dbStatus.totalNodes} nodes)` : 'AuraDB Offline'}
            </div>

            <button
              onClick={() => setHelpModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <HelpCircle className="w-4 h-4 text-teal-400" />
              <span>DBMS Info</span>
            </button>
          </div>
        </header>

        {/* Global Connection Warning Banner if disconnected */}
        {!dbStatus.connected && !dbStatus.loading && (
          <div className="bg-amber-950/90 border-b border-amber-800 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>AuraDB Connection Notice:</strong>{' '}
                {dbStatus.message || 'Neo4j credentials are not configured in backend/.env.'}
              </span>
            </div>
            <button
              onClick={() => setHelpModalOpen(true)}
              className="px-2.5 py-1 rounded bg-amber-900 hover:bg-amber-800 text-amber-100 font-semibold border border-amber-700 transition"
            >
              Setup .env
            </button>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Database Connection & Schema Setup Modal */}
      <Modal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="ResQNet Neo4j AuraDB Database Connection Guide"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" /> Current Connectivity Status
            </h4>
            <p className="text-xs text-slate-400">
              Status: <span className={dbStatus.connected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {dbStatus.connected ? 'CONNECTED TO AURADB' : 'DISCONNECTED'}
              </span>
            </p>
            {dbStatus.connected ? (
              <div className="mt-2 text-xs space-y-1 text-slate-300">
                <p>Host: {dbStatus.address}</p>
                <p>Agent: {dbStatus.agent}</p>
                <p>Indexed Nodes: <span className="text-teal-300 font-bold">{dbStatus.totalNodes}</span></p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-rose-300">
                {dbStatus.message || 'Driver connection failed. Please ensure your backend/.env contains correct Neo4j credentials.'}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-white mb-2">How to configure your live AuraDB connection:</h4>
            <p className="text-xs text-slate-400 mb-2">
              Create or edit <code className="text-teal-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">backend/.env</code> with your AuraDB credentials:
            </p>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-teal-300 overflow-x-auto">
{`PORT=5000
NEO4J_URI=neo4j+s://your-db-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_super_secret_password
NEO4J_DATABASE=neo4j
LOW_STOCK_THRESHOLD=25`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-xs">ResQNet 9-Entity Graph Schema Preserved:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300">ROLE</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300">USER</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-teal-300">LOCATION</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-rose-300">DISASTER</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-300">EMERGENCY_REQUEST</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">VOLUNTEER</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-yellow-300">ASSIGNMENT</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-pink-300">RESOURCE</span>
              <span className="p-1.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">INVENTORY</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={checkHealth}
              disabled={checkingConn}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingConn ? 'animate-spin' : ''}`} />
              Test Connection Now
            </button>
            <button
              onClick={() => setHelpModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

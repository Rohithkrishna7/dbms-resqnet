import React, { useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { 
  Sparkles,
  Flame, 
  Users, 
  ClipboardList, 
  LifeBuoy, 
  GitBranch, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sliders,
  Search,
  MapPin,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { NotificationBanner } from '../components/Notification';

const ALLOWED_LABELS = ['Location', 'User', 'Disaster', 'Request', 'Volunteer', 'Resource'];

const LABEL_COLORS = {
  Location: '#10b981',
  User: '#3b82f6',
  Disaster: '#ef4444',
  Request: '#f97316',
  Volunteer: '#06b6d4',
  Resource: '#ec4899',
  Node: '#94a3b8'
};

export function AdvancedQueriesPage() {
  const [activeTab, setActiveTab] = useState('critical');

  // State for Tab A: Critical Pending Requests
  const [criticalRequests, setCriticalRequests] = useState([]);
  const [loadingCritical, setLoadingCritical] = useState(false);
  const [errorCritical, setErrorCritical] = useState(null);
  const [criticalPriority, setCriticalPriority] = useState('Critical');
  const [criticalStatus, setCriticalStatus] = useState('Pending');

  // State for Tab B: Available Experienced Volunteers
  const [volunteers, setVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [errorVolunteers, setErrorVolunteers] = useState(null);
  const [minExperience, setMinExperience] = useState('1');
  const [volunteerAvailability, setVolunteerAvailability] = useState('Available');

  // State for Tab C: Volunteers with Multiple Assignments
  const [multiAssignments, setMultiAssignments] = useState([]);
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [errorMulti, setErrorMulti] = useState(null);
  const [minAssignments, setMinAssignments] = useState('2');

  // State for Tab D: Requests Needing Assignment
  const [unassignedRequests, setUnassignedRequests] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [errorUnassigned, setErrorUnassigned] = useState(null);
  const [includeResolved, setIncludeResolved] = useState(false);

  // State for Tab E: Shortest Path Explorer
  const [startId, setStartId] = useState('1');
  const [endId, setEndId] = useState('101');
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [maxDepth, setMaxDepth] = useState('6');
  const [pathResult, setPathResult] = useState(null);
  const [loadingPath, setLoadingPath] = useState(false);
  const [errorPath, setErrorPath] = useState(null);

  const cyContainerRef = useRef(null);
  const cyInstanceRef = useRef(null);

  // ── Tab A: Fetch Critical Pending Requests ──
  const fetchCriticalRequests = async () => {
    setLoadingCritical(true);
    setErrorCritical(null);
    try {
      const res = await api.getCriticalActiveRequests({
        priority: criticalPriority,
        status: criticalStatus
      });
      if (res.success) {
        setCriticalRequests(res.data || []);
      }
    } catch (err) {
      setErrorCritical(err.message || 'Failed to fetch critical requests');
    } finally {
      setLoadingCritical(false);
    }
  };

  // ── Tab B: Fetch Available Experienced Volunteers ──
  const fetchExperiencedVolunteers = async () => {
    const minExpNum = Number(minExperience);
    if (isNaN(minExpNum) || minExpNum < 0) {
      setErrorVolunteers('Minimum experience must be a non-negative number.');
      return;
    }
    setLoadingVolunteers(true);
    setErrorVolunteers(null);
    try {
      const res = await api.getAvailableExperiencedVolunteers({
        minExperience: minExpNum,
        availability: volunteerAvailability
      });
      if (res.success) {
        setVolunteers(res.data || []);
      }
    } catch (err) {
      setErrorVolunteers(err.message || 'Failed to fetch volunteers');
    } finally {
      setLoadingVolunteers(false);
    }
  };

  // ── Tab C: Fetch Multiple Assignments ──
  const fetchMultipleAssignments = async () => {
    const minAssignNum = parseInt(minAssignments, 10);
    if (isNaN(minAssignNum) || minAssignNum < 2) {
      setErrorMulti('Minimum assignment count must be an integer >= 2.');
      return;
    }
    setLoadingMulti(true);
    setErrorMulti(null);
    try {
      const res = await api.getVolunteersMultipleAssignments({
        minAssignments: minAssignNum
      });
      if (res.success) {
        setMultiAssignments(res.data || []);
      }
    } catch (err) {
      setErrorMulti(err.message || 'Failed to fetch multiple assignments');
    } finally {
      setLoadingMulti(false);
    }
  };

  // ── Tab D: Fetch Unassigned Requests ──
  const fetchUnassignedRequests = async () => {
    setLoadingUnassigned(true);
    setErrorUnassigned(null);
    try {
      const res = await api.getUnassignedRequests({ includeResolved });
      if (res.success) {
        setUnassignedRequests(res.data || []);
      }
    } catch (err) {
      setErrorUnassigned(err.message || 'Failed to fetch unassigned requests');
    } finally {
      setLoadingUnassigned(false);
    }
  };

  // ── Tab E: Run Shortest Path ──
  const runShortestPath = async () => {
    if (!startId.trim() || !endId.trim()) {
      setErrorPath('Both Start Entity ID and End Entity ID are required.');
      return;
    }
    const depthNum = parseInt(maxDepth, 10);
    if (isNaN(depthNum) || depthNum < 1 || depthNum > 10) {
      setErrorPath('Maximum depth must be an integer between 1 and 10.');
      return;
    }

    setLoadingPath(true);
    setErrorPath(null);
    setPathResult(null);

    try {
      const params = {
        startId: startId.trim(),
        endId: endId.trim(),
        maxDepth: depthNum
      };
      if (startLabel) params.startLabel = startLabel;
      if (endLabel) params.endLabel = endLabel;

      const res = await api.getShortestPath(params);
      if (res.success) {
        setPathResult(res);
      }
    } catch (err) {
      setErrorPath(err.message || 'Failed to compute shortest path');
    } finally {
      setLoadingPath(false);
    }
  };

  // Render Cytoscape canvas when pathResult has elements
  useEffect(() => {
    if (activeTab === 'shortest-path' && pathResult?.elements?.length && cyContainerRef.current) {
      if (cyInstanceRef.current) {
        cyInstanceRef.current.destroy();
      }

      try {
        const cy = cytoscape({
          container: cyContainerRef.current,
          elements: pathResult.elements,
          style: [
            {
              selector: 'node',
              style: {
                'label': 'data(name)',
                'background-color': 'data(color)',
                'color': '#f8fafc',
                'font-family': 'Plus Jakarta Sans, sans-serif',
                'font-size': '11px',
                'font-weight': 600,
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'text-background-color': '#0f172a',
                'text-background-opacity': 0.85,
                'text-background-padding': 3,
                'text-background-shape': 'roundrectangle',
                'width': 38,
                'height': 38,
                'border-width': 2,
                'border-color': '#ffffff',
                'border-opacity': 0.4,
                'overlay-opacity': 0
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 3,
                'line-color': '#14b8a6',
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': '#14b8a6',
                'arrow-scale': 1.2,
                'label': 'data(label)',
                'font-size': '9px',
                'font-family': 'JetBrains Mono, monospace',
                'color': '#cbd5e1',
                'text-rotation': 'autorotate',
                'text-margin-y': -8,
                'text-background-color': '#020617',
                'text-background-opacity': 0.85,
                'text-background-padding': 3,
                'text-background-shape': 'roundrectangle'
              }
            }
          ],
          layout: {
            name: 'breadthfirst',
            directed: false,
            padding: 40,
            spacingFactor: 1.5,
            animate: false
          }
        });

        cyInstanceRef.current = cy;
      } catch (e) {
        console.warn('Cytoscape render error:', e);
      }
    }
  }, [activeTab, pathResult]);

  // Initial load when switching tabs
  useEffect(() => {
    if (activeTab === 'critical' && criticalRequests.length === 0 && !loadingCritical) {
      fetchCriticalRequests();
    } else if (activeTab === 'experienced' && volunteers.length === 0 && !loadingVolunteers) {
      fetchExperiencedVolunteers();
    } else if (activeTab === 'multi' && multiAssignments.length === 0 && !loadingMulti) {
      fetchMultipleAssignments();
    } else if (activeTab === 'unassigned' && unassignedRequests.length === 0 && !loadingUnassigned) {
      fetchUnassignedRequests();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-teal-400" />
            Advanced Graph Queries
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Targeted Neo4j graph traversals, aggregation filters, conditional matches, and topological shortest-path analysis
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="glass-panel p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('critical')}
          className={`flex-1 min-w-[170px] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'critical'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          Critical Requests
        </button>

        <button
          onClick={() => setActiveTab('experienced')}
          className={`flex-1 min-w-[170px] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'experienced'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4 text-cyan-400" />
          Experienced Volunteers
        </button>

        <button
          onClick={() => setActiveTab('multi')}
          className={`flex-1 min-w-[170px] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'multi'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-indigo-400" />
          Multi-Assignments
        </button>

        <button
          onClick={() => setActiveTab('unassigned')}
          className={`flex-1 min-w-[170px] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'unassigned'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-amber-400" />
          Unassigned Requests
        </button>

        <button
          onClick={() => setActiveTab('shortest-path')}
          className={`flex-1 min-w-[170px] px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'shortest-path'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <GitBranch className="w-4 h-4 text-teal-400" />
          Shortest Path
        </button>
      </div>

      {/* ── SECTION A: Critical Pending Requests ── */}
      {activeTab === 'critical' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <span className="text-[11px] font-bold text-rose-400 tracking-wide uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Cypher Traversal Pattern
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                MATCH (r:Request)-[:RELATED_TO]-&gt;(d:Disaster) WHERE r.priority=&apos;Critical&apos; AND r.status=&apos;Pending&apos; AND d.status=&apos;Active&apos;
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={criticalPriority}
                onChange={(e) => setCriticalPriority(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="Critical">Priority: Critical</option>
                <option value="High">Priority: High</option>
                <option value="Medium">Priority: Medium</option>
              </select>

              <select
                value={criticalStatus}
                onChange={(e) => setCriticalStatus(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="Pending">Status: Pending</option>
                <option value="In Progress">Status: In Progress</option>
              </select>

              <button
                onClick={fetchCriticalRequests}
                disabled={loadingCritical}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCritical ? 'animate-spin' : ''}`} />
                Run Query
              </button>
            </div>
          </div>

          {errorCritical && <NotificationBanner type="error" message={errorCritical} onClose={() => setErrorCritical(null)} />}

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Matching Emergency Requests</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {criticalRequests.length} Found
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Strict filter: Active crisis zones only</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Disaster Incident</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Requester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loadingCritical ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-teal-400 mb-2" />
                        Executing Cypher pattern match...
                      </td>
                    </tr>
                  ) : criticalRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No critical pending requests found for active disasters.
                      </td>
                    </tr>
                  ) : (
                    criticalRequests.map((r) => (
                      <tr key={r.RequestID} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">#{r.RequestID}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{r.Type}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.Priority} type="priority" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.Status} type="status" />
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-400" title={r.Description}>
                          {r.Description || 'No details provided'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-rose-300">{r.DisasterName}</div>
                          <span className="text-[10px] text-slate-500 font-mono">Disaster #{r.DisasterID}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200">{r.LocationName}</div>
                          {r.LocationCity && <span className="text-[10px] text-slate-500">{r.LocationCity}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{r.RequesterName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION B: Available and Experienced Volunteers ── */}
      {activeTab === 'experienced' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <span className="text-[11px] font-bold text-cyan-400 tracking-wide uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Experience Threshold & Readiness
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                MATCH (v:Volunteer) WHERE v.availability=$avail AND v.experienceYears &gt;= $minExp
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Min. Exp (Years):</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={minExperience}
                  onChange={(e) => setMinExperience(e.target.value)}
                  className="w-20 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Availability:</label>
                <select
                  value={volunteerAvailability}
                  onChange={(e) => setVolunteerAvailability(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="Available">Available</option>
                  <option value="Deployed">Deployed</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <button
                onClick={fetchExperiencedVolunteers}
                disabled={loadingVolunteers}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingVolunteers ? 'animate-spin' : ''}`} />
                Run Query
              </button>
            </div>
          </div>

          {errorVolunteers && <NotificationBanner type="error" message={errorVolunteers} onClose={() => setErrorVolunteers(null)} />}

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Matching Volunteers</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {volunteers.length} Qualified
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Active assignments exclude Completed, Resolved & Cancelled</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Volunteer ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Active Missions</th>
                    <th className="py-3 px-4">Total Assignments</th>
                    <th className="py-3 px-4">Contact Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loadingVolunteers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-teal-400 mb-2" />
                        Querying volunteer profiles & experience metrics...
                      </td>
                    </tr>
                  ) : volunteers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No volunteers match the specified criteria (≥ {minExperience} yrs, {volunteerAvailability}).
                      </td>
                    </tr>
                  ) : (
                    volunteers.map((v) => (
                      <tr key={v.VolunteerID} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">#{v.VolunteerID}</td>
                        <td className="py-3 px-4 font-semibold text-slate-100">{v.Name}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={v.Availability} type="status" />
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyan-400">
                          {v.ExperienceYears} {v.ExperienceYears === 1 ? 'Year' : 'Years'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            v.activeAssignments > 0 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {v.activeAssignments} Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{v.assignmentCount} lifetime</td>
                        <td className="py-3 px-4 text-slate-400">
                          <div>{v.Email || 'No email registered'}</div>
                          {v.Phone && <span className="text-[10px] text-slate-500">{v.Phone}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION C: Volunteers with Multiple Assignments ── */}
      {activeTab === 'multi' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <span className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> High-Load Volunteer Aggregation
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                MATCH (v)-[a:ASSIGNED_TO]-&gt;(r) WITH v, count(a) AS count WHERE count &gt;= $min
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Min. Assignments:</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={minAssignments}
                  onChange={(e) => setMinAssignments(e.target.value)}
                  className="w-20 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                onClick={fetchMultipleAssignments}
                disabled={loadingMulti}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMulti ? 'animate-spin' : ''}`} />
                Run Query
              </button>
            </div>
          </div>

          {errorMulti && <NotificationBanner type="error" message={errorMulti} onClose={() => setErrorMulti(null)} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingMulti ? (
              <div className="col-span-full py-12 text-center text-slate-400 glass-panel rounded-2xl border border-slate-800">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-teal-400 mb-2" />
                Aggregating volunteer assignment relationships...
              </div>
            ) : multiAssignments.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800">
                No volunteers have {minAssignments} or more assigned requests.
              </div>
            ) : (
              multiAssignments.map((v) => (
                <div key={v.VolunteerID} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-teal-400 font-bold">#{v.VolunteerID}</span>
                        <h4 className="font-bold text-slate-100 text-base">{v.Name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{v.Email || 'No contact email'}</p>
                    </div>

                    <span className="px-3 py-1 rounded-xl font-mono text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                      {v.assignmentCount} Assignments
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Availability: <StatusBadge status={v.Availability} type="status" /></span>
                    <span className="text-slate-600">•</span>
                    <span>Experience: <strong className="text-slate-200">{v.ExperienceYears} yrs</strong></span>
                  </div>

                  {/* Related Volunteer Assignments list */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Related Volunteer Assignments:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {v.assignments && v.assignments.map((a, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-200">{a.RequestType}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">Req #{a.RequestID}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">Assign #{a.AssignmentID}</span>
                            <StatusBadge status={a.Status} type="status" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SECTION D: Requests Needing Assignment ── */}
      {activeTab === 'unassigned' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <span className="text-[11px] font-bold text-amber-400 tracking-wide uppercase flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5" /> Requests Awaiting Volunteer Dispatch
              </span>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                MATCH (r:Request) WHERE NOT ()-[:ASSIGNED_TO]-&gt;(r) {!includeResolved ? "AND NOT r.status IN ['Resolved', 'Cancelled']" : ''}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={includeResolved}
                  onChange={(e) => setIncludeResolved(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Include Resolved & Cancelled</span>
              </label>

              <button
                onClick={fetchUnassignedRequests}
                disabled={loadingUnassigned}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingUnassigned ? 'animate-spin' : ''}`} />
                Run Query
              </button>
            </div>
          </div>

          {/* Explanation badge */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              {includeResolved 
                ? 'Showing all emergency requests in the database that have no incoming assignment relationship.'
                : 'Default view filters specifically for actionable requests needing volunteer assignment (excluding requests that are already Resolved or Cancelled).'}
            </span>
          </div>

          {errorUnassigned && <NotificationBanner type="error" message={errorUnassigned} onClose={() => setErrorUnassigned(null)} />}

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Unassigned Requests List</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unassignedRequests.length} Requiring Attention
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Disaster</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Requester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {loadingUnassigned ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-teal-400 mb-2" />
                        Scanning requests for missing ASSIGNED_TO edges...
                      </td>
                    </tr>
                  ) : unassignedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {includeResolved 
                          ? 'All emergency requests have assigned volunteers.' 
                          : 'No unassigned actionable requests! All pending requests have assigned personnel.'}
                      </td>
                    </tr>
                  ) : (
                    unassignedRequests.map((r) => (
                      <tr key={r.RequestID} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white">#{r.RequestID}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{r.Type}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.Priority} type="priority" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.Status} type="status" />
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-400" title={r.Description}>
                          {r.Description || 'No description'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{r.DisasterName}</div>
                          {r.DisasterID && <span className="text-[10px] text-slate-500 font-mono">ID: {r.DisasterID}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200">{r.LocationName}</div>
                          {r.LocationCity && <span className="text-[10px] text-slate-500">{r.LocationCity}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{r.RequesterName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION E: Shortest Path Explorer ── */}
      {activeTab === 'shortest-path' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[11px] font-bold text-teal-400 tracking-wide uppercase flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" /> Shortest Path Traversal
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Finds the minimal sequence of relationships connecting two entities across the crisis network
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Presets:</span>
                <button
                  onClick={() => { setStartId('1'); setStartLabel('User'); setEndId('101'); setEndLabel('Location'); }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-lg text-slate-300 transition"
                >
                  User #1 → Loc #101
                </button>
                <button
                  onClick={() => { setStartId('401'); setStartLabel('Volunteer'); setEndId('201'); setEndLabel('Disaster'); }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-lg text-slate-300 transition"
                >
                  Vol #401 → Dis #201
                </button>
              </div>
            </div>

            {/* Inputs Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Start Entity ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 or 401"
                  value={startId}
                  onChange={(e) => setStartId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Start Label (Optional)
                </label>
                <select
                  value={startLabel}
                  onChange={(e) => setStartLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="">Any Label</option>
                  {ALLOWED_LABELS.map((lbl) => (
                    <option key={lbl} value={lbl}>{lbl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  End Entity ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 101 or 201"
                  value={endId}
                  onChange={(e) => setEndId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  End Label (Optional)
                </label>
                <select
                  value={endLabel}
                  onChange={(e) => setEndLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="">Any Label</option>
                  {ALLOWED_LABELS.map((lbl) => (
                    <option key={lbl} value={lbl}>{lbl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Max Depth (1-10)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={runShortestPath}
                    disabled={loadingPath}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-lg shadow-teal-500/20 disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Find
                  </button>
                </div>
              </div>
            </div>
          </div>

          {errorPath && <NotificationBanner type="error" message={errorPath} onClose={() => setErrorPath(null)} />}

          {/* Path Results Section */}
          {loadingPath ? (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400 mb-2" />
              Executing shortest path algorithm in Neo4j AuraDB...
            </div>
          ) : pathResult ? (
            <div className="space-y-4">
              {/* Path Summary Banner */}
              <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                pathResult.found 
                  ? 'bg-teal-950/40 border-teal-800/50 text-teal-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-3">
                  {pathResult.found ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-white text-sm">
                      {pathResult.found ? 'Shortest Path Discovered!' : 'No Path Found'}
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {pathResult.found 
                        ? `Path length: ${pathResult.pathLength} ${pathResult.pathLength === 1 ? 'hop' : 'hops'} between ${pathResult.startNode?.name} and ${pathResult.targetNode?.name}`
                        : pathResult.message || 'No connecting relationships within the specified maximum search depth.'}
                    </p>
                  </div>
                </div>

                {pathResult.found && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
                      {pathResult.summary?.nodes} Nodes
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
                      {pathResult.summary?.edges} Relationships
                    </span>
                  </div>
                )}
              </div>

              {/* Cytoscape Visualizer Canvas */}
              {pathResult.found && (
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-400" />
                      Visual Path Topology (Cytoscape Canvas)
                    </span>
                    <span className="text-[10px] text-slate-500">Interactive Canvas — Drag nodes to explore</span>
                  </div>

                  <div 
                    ref={cyContainerRef}
                    className="w-full h-72 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden"
                  />
                </div>
              )}

              {/* Step-by-Step Traversal Table */}
              {pathResult.found && pathResult.elements && (
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-200">Traversed Entities & Relationships</span>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {pathResult.elements
                      .filter(el => !el.data.source)
                      .map((nodeEl, idx, arr) => (
                        <React.Fragment key={nodeEl.data.id}>
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5 shadow-sm">
                            <span 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: nodeEl.data.color || '#94a3b8' }}
                            />
                            <div>
                              <div className="font-bold text-slate-100 text-xs">{nodeEl.data.name}</div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {nodeEl.data.label}
                              </span>
                            </div>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="flex items-center text-teal-400 px-1">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              Enter Start ID and End ID, then click &quot;Find&quot; to compute the shortest graph path.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

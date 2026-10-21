import React, { useState, useEffect, useMemo } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Eye,
  RefreshCw,
  MapPin,
  Flame,
  User,
  UserCheck,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { NotificationBanner } from '../components/Notification';

// Priority rank for sorting (lower = higher urgency)
const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function EmergencyRequestsPage() {
  // ── raw data from API ───────────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── client-side filter / sort controls ──────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('id_desc'); // id_desc | id_asc | date_desc | date_asc | priority

  // ── dropdown metadata ───────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [locations, setLocations] = useState([]);

  // ── modals ──────────────────────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // ── form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    RequestID: '',
    Type: '',
    Description: '',
    Priority: 'High',
    Status: 'Pending',
    UserID: '',
    DisasterID: '',
    LocationID: ''
  });

  // ── data loading ─────────────────────────────────────────────────────────────
  // Always fetches all requests. Search/filter/sort are pure client-side.
  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRequests();
      if (res.success) setRequests(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load emergency requests');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [uRes, dRes, lRes] = await Promise.all([
        api.getUsers(),
        api.getDisastersMeta(),
        api.getLocations()
      ]);
      if (uRes.success) setUsers(uRes.data);
      if (dRes.success) setDisasters(dRes.data);
      if (lRes.success) setLocations(lRes.data);
    } catch (e) {
      console.warn('Could not load metadata for dropdowns:', e.message);
    }
  };

  useEffect(() => {
    loadRequests();
    loadMetadata();
  }, []); // load once on mount; controls do NOT trigger re-fetch

  // ── derived: filtered + sorted list ─────────────────────────────────────────
  const displayedRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let filtered = requests.filter((r) => {
      // priority filter
      if (priorityFilter && r.Priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
      // status filter
      if (statusFilter && r.Status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      // search across all visible text fields
      if (term) {
        const haystack = [
          String(r.RequestID),
          r.Type,
          r.Description,
          r.Priority,
          r.Status,
          r.RequesterName,
          r.DisasterName,
          r.LocationName,
          r.AssignedVolunteerName,
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    // sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'id_asc':  return Number(a.RequestID) - Number(b.RequestID);
        case 'id_desc': return Number(b.RequestID) - Number(a.RequestID);
        case 'date_asc':  return new Date(a.RequestDate) - new Date(b.RequestDate);
        case 'date_desc': return new Date(b.RequestDate) - new Date(a.RequestDate);
        case 'priority': {
          const pa = PRIORITY_RANK[a.Priority] ?? 99;
          const pb = PRIORITY_RANK[b.Priority] ?? 99;
          return pa !== pb ? pa - pb : Number(b.RequestID) - Number(a.RequestID);
        }
        default: return Number(b.RequestID) - Number(a.RequestID);
      }
    });

    return filtered;
  }, [requests, searchTerm, priorityFilter, statusFilter, sortKey]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
    setSortKey('id_desc');
    // no re-fetch needed — memo recalculates from unfiltered `requests`
  };



  const openDetails = async (id) => {
    try {
      const res = await api.getRequest(id);
      if (res.success) {
        setSelectedRequest(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openStatusChange = (req) => {
    setSelectedRequest(req);
    setNewStatus(req.Status);
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !newStatus) return;
    try {
      const res = await api.updateRequestStatus(selectedRequest.RequestID, newStatus);
      if (res.success) {
        setSuccessMsg(`Request ${selectedRequest.RequestID} updated to "${newStatus}"`);
        setStatusModalOpen(false);
        loadRequests();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.createRequest(formData);
      if (res.success) {
        setSuccessMsg(`Emergency Request "${formData.RequestID}" created and connected!`);
        setCreateModalOpen(false);
        setFormData({
          RequestID: '',
          Type: '',
          Description: '',
          Priority: 'High',
          Status: 'Pending',
          UserID: '',
          DisasterID: '',
          LocationID: ''
        });
        loadRequests();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-amber-500" />
            Emergency Requests
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Civilian SOS calls, rescue dispatches, and material requests connected to disasters & volunteers
          </p>
        </div>
        <button
          onClick={() => {
            if (!formData.RequestID) {
              setFormData(prev => ({ ...prev, RequestID: `REQ-${Date.now().toString().slice(-4)}` }));
            }
            setCreateModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Emergency Request
        </button>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <NotificationBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Live search — filters as you type */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ID, type, description, requester, disaster, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="id_desc">ID: Newest first</option>
              <option value="id_asc">ID: Oldest first</option>
              <option value="date_desc">Date: Latest first</option>
              <option value="date_asc">Date: Earliest first</option>
              <option value="priority">Priority: Critical first</option>
            </select>
          </div>

          {/* Reset all controls */}
          <button
            onClick={handleReset}
            title="Reset all filters"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Type & Description</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Requester</th>
                <th className="py-3.5 px-4">Disaster</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Volunteer</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {/* Result count badge */}
              {!loading && (
                <tr className="bg-slate-900/40">
                  <td colSpan={9} className="py-1.5 px-4 text-[10px] text-slate-500">
                    Showing <span className="text-teal-400 font-semibold">{displayedRequests.length}</span> of {requests.length} requests
                    {(searchTerm || priorityFilter || statusFilter) && (
                      <button onClick={handleReset} className="ml-2 text-slate-500 hover:text-teal-400 underline transition">clear filters</button>
                    )}
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                    Loading requests from Neo4j...
                  </td>
                </tr>
              ) : displayedRequests.length > 0 ? (
                displayedRequests.map((r) => (
                  <tr key={r.RequestID} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">
                      {r.RequestID}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-white text-sm">{r.Type}</span>
                      {r.Description && (
                        <p className="text-[11px] text-slate-400 truncate">{r.Description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.Priority} type="priority" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.Status} type="status" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {r.RequesterName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        {r.DisasterName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {r.LocationName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.AssignedVolunteerName ? (
                        <span className="inline-flex items-center gap-1 text-cyan-300 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          {r.AssignedVolunteerName}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetails(r.RequestID)}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStatusChange(r)}
                          title="Update Status"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    {requests.length > 0
                      ? <>No requests match the current filters. <button onClick={handleReset} className="text-teal-400 hover:underline">Clear filters</button></>
                      : 'No emergency requests found in database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Emergency Request */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Submit Emergency Request"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Request ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.RequestID}
                onChange={(e) => setFormData({ ...formData, RequestID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Request Type <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Medical Aid, Evacuation, Food Rations"
                value={formData.Type}
                onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={formData.Priority}
                onChange={(e) => setFormData({ ...formData, Priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Status</label>
              <select
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Requester User (:SUBMITTED by)
              </label>
              <select
                value={formData.UserID}
                onChange={(e) => setFormData({ ...formData, UserID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Anonymous / Select User --</option>
                {users.map(u => (
                  <option key={u.UserID} value={u.UserID}>
                    {u.Name} [{u.UserID}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Related Disaster (:RELATED_TO_DISASTER)
              </label>
              <select
                value={formData.DisasterID}
                onChange={(e) => setFormData({ ...formData, DisasterID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- None / Select Disaster --</option>
                {disasters.map(d => (
                  <option key={d.DisasterID} value={d.DisasterID}>
                    {d.Type} [{d.DisasterID}]
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Requested At Location (:REQUESTED_AT)
              </label>
              <select
                value={formData.LocationID}
                onChange={(e) => setFormData({ ...formData, LocationID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Select Location --</option>
                {locations.map(l => (
                  <option key={l.LocationID} value={l.LocationID}>
                    {l.Name} {l.City ? `(${l.City})` : ''} [{l.LocationID}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Urgency</label>
            <textarea
              rows={3}
              placeholder="State exact assistance required, people trapped, supplies needed..."
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20"
            >
              Submit to Neo4j
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Status Update */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: ${selectedRequest?.RequestID}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Change the lifecycle status of request <strong>{selectedRequest?.RequestID}</strong>. This update directly executes Cypher in Neo4j.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Assigned">Assigned</option>
              <option value="Resolved">Resolved</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
            >
              Confirm Update
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Details */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Request Details: ${selectedRequest?.RequestID}`}
        maxWidth="max-w-2xl"
      >
        {selectedRequest && (
          <div className="space-y-5 text-xs text-slate-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Priority</p>
                <div className="mt-1"><StatusBadge status={selectedRequest.Priority} type="priority" /></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
                <div className="mt-1"><StatusBadge status={selectedRequest.Status} type="status" /></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Type</p>
                <p className="mt-1 font-semibold text-white">{selectedRequest.Type}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Date</p>
                <p className="mt-1 font-semibold text-white">{selectedRequest.RequestDate}</p>
              </div>
            </div>

            {selectedRequest.Description && (
              <div>
                <h4 className="font-bold text-white mb-1">Description</h4>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                  {selectedRequest.Description}
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white">Connected Graph Entities</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Requester (USER)</p>
                  <p className="font-semibold text-white mt-0.5">{selectedRequest.RequesterName}</p>
                  {selectedRequest.RequesterEmail && (
                    <p className="text-[11px] text-slate-400">{selectedRequest.RequesterEmail}</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Related Disaster</p>
                  <p className="font-semibold text-white mt-0.5">{selectedRequest.DisasterName}</p>
                  <p className="text-[11px] text-slate-400">ID: {selectedRequest.DisasterID || 'None'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Location Node</p>
                  <p className="font-semibold text-white mt-0.5">{selectedRequest.LocationName}</p>
                  <p className="text-[11px] text-slate-400">{selectedRequest.LocationCity}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Assignment & Volunteer</p>
                  <p className="font-semibold text-white mt-0.5">
                    {selectedRequest.VolunteerName ? selectedRequest.VolunteerName : 'None Assigned'}
                  </p>
                  {selectedRequest.AssignmentID && (
                    <p className="text-[11px] text-teal-400 font-mono">Assignment: {selectedRequest.AssignmentID}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

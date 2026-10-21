import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  RefreshCw, 
  Calendar, 
  UserCheck, 
  LifeBuoy, 
  MapPin, 
  Flame, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { NotificationBanner } from '../components/Notification';

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [newStatus, setNewStatus] = useState('In Progress');

  // Form State
  const [formData, setFormData] = useState({
    AssignmentID: '',
    VolunteerID: '',
    RequestID: '',
    Status: 'Assigned',
    AssignedDate: new Date().toISOString().split('T')[0]
  });

  // Always fetch all assignments on mount and after mutations.
  // Search/filter/sort are client-side via useMemo.
  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAssignments();
      if (res.success) setAssignments(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [vRes, rRes] = await Promise.all([
        api.getVolunteersMeta(),
        api.getRequestsMeta()
      ]);
      if (vRes.success) setVolunteers(vRes.data);
      if (rRes.success) setRequests(rRes.data);
    } catch (e) {
      console.warn('Could not load metadata for assignment creation:', e.message);
    }
  };

  useEffect(() => {
    loadAssignments();
    loadMetadata();
  }, []); // load once; controls do not trigger re-fetch

  // ── derived: filtered list ──────────────────────────────────────────────────
  const displayedAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return assignments.filter((a) => {
      if (statusFilter && (a.Status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (term) {
        const haystack = [
          a.AssignmentID,
          a.VolunteerName,
          a.VolunteerID,
          a.RequestType,
          a.RequestID,
          a.Status,
          a.DisasterType,
          a.LocationName,
          a.RequestPriority,
        ].filter(v => v !== null && v !== undefined).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [assignments, searchTerm, statusFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    // no re-fetch needed — useMemo recalculates
  };


  const openStatusModal = (a) => {
    setSelectedAssignment(a);
    setNewStatus(a.Status || 'Assigned');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    try {
      const res = await api.updateAssignmentStatus(selectedAssignment.AssignmentID, newStatus);
      if (res.success) {
        setSuccessMsg(`Assignment ${selectedAssignment.AssignmentID} status updated to "${newStatus}"!`);
        setStatusModalOpen(false);
        loadAssignments();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.createAssignment(formData);
      if (res.success) {
        setSuccessMsg(`Assignment "${formData.AssignmentID}" created successfully!`);
        setCreateModalOpen(false);
        setFormData({
          AssignmentID: '',
          VolunteerID: '',
          RequestID: '',
          Status: 'Assigned',
          AssignedDate: new Date().toISOString().split('T')[0]
        });
        loadAssignments();
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
            <ClipboardList className="w-6 h-6 text-yellow-400" />
            Volunteer Assignments
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Dispatch management linking volunteer personnel to emergency relief requests
          </p>
        </div>
        <button
          onClick={() => {
            if (!formData.AssignmentID) {
              setFormData(prev => ({ ...prev, AssignmentID: `A${Date.now().toString().slice(-4)}` }));
            }
            setCreateModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Assign Volunteer
        </button>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <NotificationBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Live search — filters as you type */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by assignment ID, volunteer, request type, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Assignment Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={handleReset}
            title="Reset filters"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Assignment ID</th>
                <th className="py-3.5 px-4">Volunteer Personnel</th>
                <th className="py-3.5 px-4">Associated Emergency Request</th>
                <th className="py-3.5 px-4">Disaster & Location</th>
                <th className="py-3.5 px-4">Assigned Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {!loading && (
                <tr className="bg-slate-900/40">
                  <td colSpan={7} className="py-1.5 px-4 text-[10px] text-slate-500">
                    Showing <span className="text-teal-400 font-semibold">{displayedAssignments.length}</span> of {assignments.length} assignments
                    {(searchTerm || statusFilter) && (
                      <button onClick={handleReset} className="ml-2 text-slate-500 hover:text-teal-400 underline transition">clear filters</button>
                    )}
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                    Loading assignments from Neo4j...
                  </td>
                </tr>
              ) : displayedAssignments.length > 0 ? (
                displayedAssignments.map((a) => (
                  <tr key={a.AssignmentID} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      {a.AssignmentID}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                        <div>
                          <p className="font-bold text-white">{a.VolunteerName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">ID: {a.VolunteerID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <LifeBuoy className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="font-semibold text-white">{a.RequestType}</p>
                          <p className="text-[10px] text-teal-400 font-mono">Req ID: {a.RequestID}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        {a.DisasterType && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <Flame className="w-3 h-3 text-rose-500" />
                            <span>{a.DisasterType}</span>
                          </div>
                        )}
                        {a.LocationName && (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{a.LocationName}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {a.AssignedDate}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={a.Status} type="status" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openStatusModal(a)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-[11px] border border-slate-700 transition"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {assignments.length > 0
                      ? <>No assignments match the current filters. <button onClick={handleReset} className="text-teal-400 hover:underline">Clear filters</button></>
                      : 'No assignment records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Assignment with Validation */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Deploy Volunteer on Emergency Assignment"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            This operation validates that the selected volunteer and emergency request exist in Neo4j, then creates an <code className="text-teal-300 font-bold">ASSIGNMENT</code> node and links it with <code className="text-teal-300 font-bold">:HAS_ASSIGNMENT</code> and <code className="text-teal-300 font-bold">:FOR_REQUEST</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assignment ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.AssignmentID}
                onChange={(e) => setFormData({ ...formData, AssignmentID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Date</label>
              <input
                type="date"
                value={formData.AssignedDate}
                onChange={(e) => setFormData({ ...formData, AssignedDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Volunteer <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.VolunteerID}
                onChange={(e) => setFormData({ ...formData, VolunteerID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose Volunteer Personnel --</option>
                {volunteers.map(v => (
                  <option key={v.VolunteerID} value={v.VolunteerID}>
                    {v.Name} [{v.VolunteerID}] - ({v.Availability})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Emergency Request <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.RequestID}
                onChange={(e) => setFormData({ ...formData, RequestID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose Emergency Request --</option>
                {requests.map(r => (
                  <option key={r.RequestID} value={r.RequestID}>
                    {r.RequestID} - {r.Type} [{r.Priority} Priority, {r.Status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Assignment Status</label>
            <select
              value={formData.Status}
              onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
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
              Validate & Create in Neo4j
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Status Update */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Assignment Status: ${selectedAssignment?.AssignmentID}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Set the execution state for assignment <strong>{selectedAssignment?.AssignmentID}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
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
    </div>
  );
}

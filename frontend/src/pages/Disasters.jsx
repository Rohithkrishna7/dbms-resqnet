import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  LifeBuoy, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { NotificationBanner } from '../components/Notification';

export function DisastersPage() {
  const [disasters, setDisasters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDisaster, setSelectedDisaster] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    DisasterID: '',
    Type: '',
    Severity: 'High',
    Status: 'Active',
    StartDate: new Date().toISOString().split('T')[0],
    Description: '',
    LocationID: ''
  });

  const [editData, setEditData] = useState({
    DisasterID: '',
    Type: '',
    Severity: 'High',
    Status: 'Active',
    StartDate: '',
    Description: '',
    LocationID: ''
  });

  // Always fetch all disasters. Client applies search/status/severity filters.
  const loadDisasters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDisasters();
      if (res.success) setDisasters(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load disasters');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await api.getLocations();
      if (res.success) setLocations(res.data);
    } catch (e) {
      console.warn('Could not load locations for dropdown:', e.message);
    }
  };

  useEffect(() => {
    loadDisasters();
    loadLocations();
  }, []); // load once; controls do not trigger re-fetch

  // ── derived: filtered list ──────────────────────────────────────────────────
  const displayedDisasters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return disasters.filter((d) => {
      if (statusFilter && (d.Status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (severityFilter && (d.Severity || '').toLowerCase() !== severityFilter.toLowerCase()) return false;
      if (term) {
        const haystack = [
          d.DisasterID,
          d.Type,
          d.Name,
          d.Severity,
          d.Status,
          d.LocationName,
          d.LocationCity,
          d.LocationState,
          d.Description,
        ].filter(val => val !== null && val !== undefined).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [disasters, searchTerm, statusFilter, severityFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSeverityFilter('');
  };


  const openDetails = async (id) => {
    try {
      const res = await api.getDisaster(id);
      if (res.success) {
        setSelectedDisaster(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (d) => {
    setEditData({
      DisasterID: d.DisasterID,
      Type: d.Type,
      Severity: d.Severity,
      Status: d.Status,
      StartDate: d.StartDate,
      Description: d.Description || '',
      LocationID: d.LocationID || ''
    });
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.createDisaster(formData);
      if (res.success) {
        setSuccessMsg(`Disaster "${formData.Type}" (ID: ${formData.DisasterID}) created successfully!`);
        setCreateModalOpen(false);
        setFormData({
          DisasterID: '',
          Type: '',
          Severity: 'High',
          Status: 'Active',
          StartDate: new Date().toISOString().split('T')[0],
          Description: '',
          LocationID: ''
        });
        loadDisasters();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.updateDisaster(editData.DisasterID, editData);
      if (res.success) {
        setSuccessMsg(`Disaster "${editData.DisasterID}" updated successfully!`);
        setEditModalOpen(false);
        loadDisasters();
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
            <Flame className="w-6 h-6 text-rose-500" />
            Disaster Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor, declare, and coordinate disaster zones linked to geographical locations
          </p>
        </div>
        <button
          onClick={() => {
            // Suggest auto-generated ID if empty
            if (!formData.DisasterID) {
              setFormData(prev => ({ ...prev, DisasterID: `D${Date.now().toString().slice(-4)}` }));
            }
            setCreateModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Declare New Disaster
        </button>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <NotificationBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filters & Search Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Live search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, type, name, severity, location…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter - values match actual DB: Active, Ongoing, Closed */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Closed">Closed</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
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

      {/* Disasters Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Disaster ID</th>
                <th className="py-3.5 px-4">Disaster Type</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Start Date</th>
                <th className="py-3.5 px-4 text-center">Requests</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {!loading && (
                <tr className="bg-slate-900/40">
                  <td colSpan={8} className="py-1.5 px-4 text-[10px] text-slate-500">
                    Showing <span className="text-teal-400 font-semibold">{displayedDisasters.length}</span> of {disasters.length} disasters
                    {(searchTerm || statusFilter || severityFilter) && (
                      <button onClick={handleReset} className="ml-2 text-slate-500 hover:text-teal-400 underline transition">clear filters</button>
                    )}
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                    Loading disaster records from Neo4j...
                  </td>
                </tr>
              ) : displayedDisasters.length > 0 ? (
                displayedDisasters.map((d) => (
                  <tr key={d.DisasterID} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">
                      {d.DisasterID}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white text-sm">{d.Type}</span>
                      {d.Description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{d.Description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.Severity} type="severity" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.Status} type="status" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {d.LocationName}
                        {d.LocationState && <span className="text-slate-500 text-[10px]">({d.LocationState})</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {d.StartDate}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-teal-300 font-bold text-[11px]">
                        {d.requestCount ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetails(d.DisasterID)}
                          title="View Connected Requests & Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(d)}
                          title="Edit Disaster Status / Severity"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {disasters.length > 0
                      ? <>No disasters match the current filters. <button onClick={handleReset} className="text-teal-400 hover:underline">Clear filters</button></>
                      : 'No disaster records found in database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Declare New Disaster */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Declare New Disaster Event"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Disaster ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. D101, DIS-006"
                value={formData.DisasterID}
                onChange={(e) => setFormData({ ...formData, DisasterID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Disaster Type <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Flood, Earthquake, Wildfire"
                value={formData.Type}
                onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity Level</label>
              <select
                value={formData.Severity}
                onChange={(e) => setFormData({ ...formData, Severity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Active">Active</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Contained">Contained</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.StartDate}
                onChange={(e) => setFormData({ ...formData, StartDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Occurred At Location (Neo4j Node)
              </label>
              <select
                value={formData.LocationID}
                onChange={(e) => setFormData({ ...formData, LocationID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Select Location --</option>
                {locations.map((loc) => (
                  <option key={loc.LocationID} value={loc.LocationID}>
                    {loc.Name} {loc.City ? `(${loc.City})` : ''} - [{loc.LocationID}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Impact Notes</label>
            <textarea
              rows={3}
              placeholder="Provide situational details, affected zones, evacuation instructions..."
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
              Save to Neo4j
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Disaster */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Disaster Record: ${editData.DisasterID}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Disaster Type</label>
              <input
                type="text"
                value={editData.Type}
                onChange={(e) => setEditData({ ...editData, Type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Severity</label>
              <select
                value={editData.Severity}
                onChange={(e) => setEditData({ ...editData, Severity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={editData.Status}
                onChange={(e) => setEditData({ ...editData, Status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Active">Active</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Contained">Contained</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location Node</label>
              <select
                value={editData.LocationID}
                onChange={(e) => setEditData({ ...editData, LocationID: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Unchanged / Select Location --</option>
                {locations.map((loc) => (
                  <option key={loc.LocationID} value={loc.LocationID}>
                    {loc.Name} {loc.City ? `(${loc.City})` : ''} - [{loc.LocationID}]
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={editData.Description}
              onChange={(e) => setEditData({ ...editData, Description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Disaster Details & Related Emergency Requests */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Disaster Profile: ${selectedDisaster?.Type || ''} (${selectedDisaster?.DisasterID || ''})`}
        maxWidth="max-w-3xl"
      >
        {selectedDisaster && (
          <div className="space-y-6 text-xs text-slate-300">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Severity</p>
                <div className="mt-1"><StatusBadge status={selectedDisaster.Severity} type="severity" /></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
                <div className="mt-1"><StatusBadge status={selectedDisaster.Status} type="status" /></div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Location</p>
                <p className="mt-1 font-semibold text-white">{selectedDisaster.LocationName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Declared Date</p>
                <p className="mt-1 font-semibold text-white">{selectedDisaster.StartDate}</p>
              </div>
            </div>

            {selectedDisaster.Description && (
              <div>
                <h4 className="font-bold text-white mb-1">Description</h4>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                  {selectedDisaster.Description}
                </p>
              </div>
            )}

            {/* Related Emergency Requests Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <LifeBuoy className="w-4 h-4 text-amber-400" />
                  Related Emergency Requests ({selectedDisaster.relatedRequests?.length || 0})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Via relationship :RELATED_TO_DISASTER
                </span>
              </div>

              {selectedDisaster.relatedRequests && selectedDisaster.relatedRequests.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
                  {selectedDisaster.relatedRequests.map((req) => (
                    <div key={req.RequestID} className="p-3 bg-slate-950/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-400">{req.RequestID}</span>
                          <span className="font-semibold text-white">{req.Type}</span>
                        </div>
                        {req.Description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{req.Description}</p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          Requester: <span className="text-slate-300">{req.RequesterName}</span> • Date: {req.RequestDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={req.Priority} type="priority" />
                        <StatusBadge status={req.Status} type="status" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500">
                  No emergency requests have been linked to this disaster yet.
                </div>
              )}
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

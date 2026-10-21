import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Phone, 
  Mail, 
  Award, 
  Briefcase, 
  CheckCircle2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { NotificationBanner } from '../components/Notification';

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Availability Modal
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [newAvailability, setNewAvailability] = useState('Available');

  // Always fetch all volunteers. Search/availability filter are client-side via useMemo.
  const loadVolunteers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getVolunteers();
      if (res.success) setVolunteers(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load volunteers from Neo4j');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
  }, []); // load once; controls do not trigger re-fetch

  // ── derived: filtered list ──────────────────────────────────────────────────
  const displayedVolunteers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return volunteers.filter((v) => {
      if (availabilityFilter && (v.Availability || '').toLowerCase() !== availabilityFilter.toLowerCase()) return false;
      if (term) {
        const haystack = [
          v.VolunteerID,
          v.Name,
          v.Availability,
          v.Experience,
          v.Skills,
          v.Email,
          v.Phone,
        ].filter(val => val !== null && val !== undefined).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [volunteers, searchTerm, availabilityFilter]);

  const handleReset = () => {
    setSearchTerm('');
    setAvailabilityFilter('');
  };


  const openAvailModal = (v) => {
    setSelectedVolunteer(v);
    setNewAvailability(v.Availability || 'Available');
    setAvailModalOpen(true);
  };

  const handleAvailSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVolunteer) return;
    try {
      const res = await api.updateVolunteerAvailability(selectedVolunteer.VolunteerID, newAvailability);
      if (res.success) {
        setSuccessMsg(`Volunteer ${selectedVolunteer.Name} updated to "${newAvailability}"!`);
        setAvailModalOpen(false);
        loadVolunteers();
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
            <Users className="w-6 h-6 text-cyan-400" />
            Volunteer Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Emergency response corps, volunteer readiness profiles, skills, and deployment assignments
          </p>
        </div>
        <button
          onClick={loadVolunteers}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <NotificationBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filter & Search Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Live search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by volunteer name, ID, experience, email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Availability Statuses</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Deployed">Deployed</option>
            <option value="On Leave">On Leave</option>
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

      {/* Volunteer Profiles Grid */}
      {!loading && (
        <div className="text-[10px] text-slate-500 px-1">
          Showing <span className="text-teal-400 font-semibold">{displayedVolunteers.length}</span> of {volunteers.length} volunteers
          {(searchTerm || availabilityFilter) && (
            <button onClick={handleReset} className="ml-2 text-slate-500 hover:text-teal-400 underline transition">clear filters</button>
          )}
        </div>
      )}
      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
          Loading volunteers from Neo4j AuraDB...
        </div>
      ) : displayedVolunteers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedVolunteers.map((v) => (
            <div
              key={v.VolunteerID}
              className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm">
                      {v.Name ? v.Name.slice(0, 2).toUpperCase() : 'VO'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{v.Name}</h3>
                      <p className="text-[11px] font-mono text-teal-400">ID: {v.VolunteerID}</p>
                    </div>
                  </div>
                  <StatusBadge status={v.Availability} type="status" />
                </div>

                {/* Contact and Experience info */}
                <div className="space-y-1.5 py-3 border-y border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Experience: <strong className="text-white">{v.Experience}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Briefcase className="w-3.5 h-3.5 text-teal-400" />
                    <span className="truncate">Skills: <strong className="text-white">{v.Skills}</strong></span>
                  </div>
                  {v.Email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{v.Email}</span>
                    </div>
                  )}
                  {v.Phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{v.Phone}</span>
                    </div>
                  )}
                </div>

                {/* Associated Assignments */}
                <div className="mt-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                    Assigned Missions ({v.assignments?.length || 0})
                  </p>
                  {v.assignments && v.assignments.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {v.assignments.map((a, idx) => (
                        <div
                          key={a.AssignmentID || idx}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono text-teal-400 font-bold">{a.AssignmentID}</span>
                            {a.RequestType && (
                              <span className="text-slate-300 ml-1.5">• {a.RequestType}</span>
                            )}
                          </div>
                          <StatusBadge status={a.Status} type="status" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No active assignments</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => openAvailModal(v)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition"
                >
                  Change Availability Status
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-slate-800 text-xs">
          {volunteers.length > 0
            ? <><span>No volunteers match the current filters. </span><button onClick={handleReset} className="text-teal-400 hover:underline">Clear filters</button></>
            : 'No volunteer records found in database.'}
        </div>
      )}

      {/* Modal: Change Availability */}
      <Modal
        isOpen={availModalOpen}
        onClose={() => setAvailModalOpen(false)}
        title={`Change Availability: ${selectedVolunteer?.Name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAvailSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Update volunteer readiness for dispatch and new emergency request assignments.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Availability Status</label>
            <select
              value={newAvailability}
              onChange={(e) => setNewAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Available">Available (Ready for dispatch)</option>
              <option value="Deployed">Deployed (Currently on mission)</option>
              <option value="Unavailable">Unavailable / Off-duty</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAvailModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
            >
              Update in Neo4j
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

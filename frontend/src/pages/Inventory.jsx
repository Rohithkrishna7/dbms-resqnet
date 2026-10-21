import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  RefreshCw, 
  MapPin, 
  AlertTriangle, 
  SlidersHorizontal, 
  Edit3, 
  Plus, 
  Minus,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import { api } from '../api/client';
import { StockBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { NotificationBanner } from '../components/Notification';

export function InventoryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Threshold
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(25);

  // Stock Update Modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState(0);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        threshold: threshold
      };
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockOnly) params.lowStockOnly = 'true';
      if (searchTerm) params.search = searchTerm;

      const res = await api.getInventory(params);
      if (res.success) setItems(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load inventory from Neo4j');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getInventoryCategories();
      if (res.success) setCategories(res.data);
    } catch (e) {
      console.warn('Could not load categories:', e.message);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [categoryFilter, lowStockOnly, threshold]);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadInventory();
  };

  const openUpdateModal = (item) => {
    setSelectedItem(item);
    setNewQuantity(item.Quantity);
    setUpdateModalOpen(true);
  };

  const handleQuantitySubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await api.updateInventoryQuantity(selectedItem.InventoryID, newQuantity);
      if (res.success) {
        setSuccessMsg(`Inventory ${selectedItem.ResourceName} stock quantity updated to ${newQuantity}!`);
        setUpdateModalOpen(false);
        loadInventory();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const lowStockCount = items.filter(i => i.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-teal-400" />
            Relief Inventory & Warehouse Supply
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time emergency resource counts, medical kits, rations, and depot storage locations
          </p>
        </div>
        <button
          onClick={loadInventory}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stock
        </button>
      </div>

      {error && <NotificationBanner type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <NotificationBanner type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Critical Stock Alert Bar */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 flex items-center justify-between gap-3 text-rose-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
            <span>
              <strong>Low Supply Warning:</strong> {lowStockCount} inventory {lowStockCount === 1 ? 'record is' : 'records are'} below or at the threshold of <strong>{threshold} units</strong>.
            </span>
          </div>
          <button
            onClick={() => setLowStockOnly(prev => !prev)}
            className="px-3 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold border border-rose-700 transition flex-shrink-0"
          >
            {lowStockOnly ? 'Show All Items' : 'Filter Low Stock Only'}
          </button>
        </div>
      )}

      {/* Filters & Configurable Threshold Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search resource name, category, warehouse location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Low Stock Checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Low Stock Only</span>
          </label>

          {/* Configurable Threshold Slider/Input */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[11px] text-slate-400 font-medium">Low Threshold:</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-xs text-teal-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setLowStockOnly(false);
              setThreshold(25);
              loadInventory();
            }}
            title="Reset filters"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Inventory ID</th>
                <th className="py-3.5 px-4">Resource Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Quantity Available</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Depot Location</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-400" />
                    Loading inventory records from Neo4j...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.InventoryID} className={`hover:bg-slate-800/40 transition ${item.isLowStock ? 'bg-rose-950/10' : ''}`}>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      {item.InventoryID}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{item.ResourceName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Resource ID: {item.ResourceID}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold">
                        {item.Category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-black ${item.isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.Quantity}
                        </span>
                        <span className="text-slate-400 text-[11px] font-medium">{item.Unit}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StockBadge quantity={item.Quantity} isLowStock={item.isLowStock} threshold={threshold} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.LocationName}</span>
                        {item.LocationCity && <span className="text-slate-500 text-[10px]">({item.LocationCity})</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openUpdateModal(item)}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Update Stock
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No inventory records match the query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Update Stock Quantity */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title={`Update Stock: ${selectedItem?.ResourceName || ''} (${selectedItem?.InventoryID || ''})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuantitySubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Directly modifies the <code className="text-teal-300 font-mono">Quantity</code> property of the <code className="text-teal-300 font-mono">INVENTORY</code> node in Neo4j.
          </p>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <p className="text-slate-400">Warehouse: <strong className="text-white">{selectedItem?.LocationName}</strong></p>
            <p className="text-slate-400">Unit of measurement: <strong className="text-white">{selectedItem?.Unit}</strong></p>
            <p className="text-slate-400">Current Stock: <strong className="text-teal-300 font-mono font-bold">{selectedItem?.Quantity}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New Stock Quantity <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewQuantity(prev => Math.max(0, Number(prev) - 10))}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                required
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center text-sm font-bold text-white focus:outline-none focus:border-teal-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setNewQuantity(prev => Number(prev) + 10)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setUpdateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
            >
              Save Quantity to Neo4j
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

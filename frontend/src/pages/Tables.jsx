import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import {
  Armchair, Plus, Trash2, Users, Pencil, X, Check,
  LayoutGrid, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const SECTIONS = ['All', 'Indoor', 'Outdoor', 'Rooftop', 'VIP', 'Bar'];

const STATUS_CONFIG = {
  available: {
    label: 'Available',
    cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  occupied: {
    label: 'Occupied',
    cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  reserved: {
    label: 'Reserved',
    cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
};

const EMPTY_FORM = { tableNumber: '', capacity: 4, section: 'Indoor' };

function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('All');
  const [togglingId, setTogglingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  // ConfirmModal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (table) => {
    setEditingId(table._id);
    setForm({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      section: table.section || 'Indoor',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (editingId) {
        await api.put(`/tables/${editingId}`, payload);
        toast.success('Table updated!');
      } else {
        await api.post('/tables', payload);
        toast.success('Table created!');
      }
      resetForm();
      fetchTables();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} table`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    await api.delete(`/tables/${deleteTargetId}`);
    setConfirmOpen(false);
    setDeleteTargetId(null);
    fetchTables();
    toast.success('Table deleted');
  };

  const toggleStatus = async (table) => {
    const nextStatus = table.status === 'available' ? 'occupied' : 'available';
    setTogglingId(table._id);
    try {
      await api.put(`/tables/${table._id}`, { status: nextStatus });
      setTables((prev) =>
        prev.map((t) => (t._id === table._id ? { ...t, status: nextStatus } : t))
      );
      toast.success(`Table ${table.tableNumber} marked ${nextStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredTables = activeSection === 'All'
    ? tables
    : tables.filter((t) => (t.section || 'Indoor') === activeSection);

  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Tables Management
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage dining tables, seat capacities, sections, and availability
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tables', value: stats.total, color: 'text-neutral-900 dark:text-white', bg: 'bg-neutral-500/10' },
          { label: 'Available', value: stats.available, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Occupied', value: stats.occupied, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Reserved', value: stats.reserved, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Create / Edit Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Table' : 'Add New Table'}
            </h2>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Table Number *
            </label>
            <input
              type="text"
              value={form.tableNumber}
              onChange={(e) => setForm((p) => ({ ...p, tableNumber: e.target.value }))}
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              placeholder="e.g. T-01"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Capacity *
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              min="1"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Section
            </label>
            <select
              value={form.section}
              onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              {SECTIONS.filter((s) => s !== 'All').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2.5 font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-xs flex items-center gap-2 active:scale-95 ${
              editingId
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
            }`}
          >
            {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {submitting ? (editingId ? 'Saving...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Table')}
          </button>
        </form>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <LayoutGrid className="w-4 h-4 text-neutral-400 shrink-0" />
        {SECTIONS.map((section) => {
          const count = section === 'All'
            ? tables.length
            : tables.filter((t) => (t.section || 'Indoor') === section).length;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeSection === section
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-amber-500/40 hover:text-amber-500'
              }`}
            >
              {section}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeSection === section ? 'bg-neutral-950/20 text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-40 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
            <Armchair className="w-8 h-8" />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {activeSection === 'All' ? 'No tables configured yet. Add one above.' : `No tables in the "${activeSection}" section.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const statusCfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
            const isToggling = togglingId === table._id;
            return (
              <div
                key={table._id}
                className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 shadow-xs relative hover:shadow-sm transition-all group ${
                  editingId === table._id
                    ? 'border-blue-500/40 ring-1 ring-blue-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-amber-500/40'
                }`}
              >
                {/* Action Buttons (top-right) */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(table)}
                    className="p-1.5 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Edit Table"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => confirmDelete(table._id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Table Icon + Section badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 w-fit">
                    <Armchair className="w-5 h-5" />
                  </div>
                  {table.section && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      {table.section}
                    </span>
                  )}
                </div>

                {/* Table name */}
                <p className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  Table {table.tableNumber}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 mb-3 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {table.capacity} Seats
                </p>

                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </span>

                {/* Quick Toggle Button */}
                <button
                  onClick={() => toggleStatus(table)}
                  disabled={isToggling || table.status === 'reserved'}
                  className={`mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                    table.status === 'available'
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20'
                      : table.status === 'occupied'
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed'
                  }`}
                >
                  {isToggling
                    ? 'Updating...'
                    : table.status === 'available'
                    ? '→ Mark Occupied'
                    : table.status === 'occupied'
                    ? '→ Mark Available'
                    : 'Reserved (manual)'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Table?"
        message="This will permanently delete the table."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTargetId(null);
        }}
      />
    </div>
  );
}

export default Tables;
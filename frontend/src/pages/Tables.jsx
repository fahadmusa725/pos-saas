import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState(4);

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

  useEffect(() => { fetchTables(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tables', { tableNumber, capacity: Number(capacity) });
      setTableNumber('');
      setCapacity(4);
      fetchTables();
      toast.success('Table created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create table');
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

  const statusColors = {
    available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    occupied:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    reserved:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Tables</h1>

      {/* Create Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Add New Table</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Table Number</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. T2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Table'}
          </button>
        </form>
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tables.length === 0 ? (
        <p className="text-gray-500">No tables yet. Add one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table._id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 relative">
              <button
                onClick={() => confirmDelete(table._id)}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
              >
                Delete
              </button>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{table.tableNumber}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Seats {table.capacity}</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[table.status]}`}>
                {table.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Table?"
        message="This will permanently delete the table."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTargetId(null); }}
      />
    </div>
  );
}

export default Tables;
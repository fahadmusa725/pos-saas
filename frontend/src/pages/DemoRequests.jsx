import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { MessageSquareText, Phone, Mail, Calendar } from 'lucide-react';

const STATUS_STYLES = {
  new: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20',
  contacted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  converted: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
};

function DemoRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/demo-requests');
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load demo requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (id, status) => {
    try {
      setUpdatingId(id);
      const res = await api.patch(`/super-admin/demo-requests/${id}/status`, { status });
      if (res.data.success) {
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
        toast.success('Status updated');
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Demo Requests</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Potential customers who requested a demo walkthrough.
        </p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <MessageSquareText className="w-8 h-8 mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
            No demo requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Restaurant</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Update Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition"
                  >
                    <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white whitespace-nowrap">{r.name}</td>
                    <td className="px-5 py-3.5 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{r.restaurantName}</td>
                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-amber-500 transition">
                        <Mail className="w-3.5 h-3.5" /> {r.email}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 hover:text-amber-500 transition">
                        <Phone className="w-3.5 h-3.5" /> {r.phone}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 max-w-xs truncate" title={r.message}>
                      {r.message || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[r.status] || STATUS_STYLES.new}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={r.status}
                        disabled={updatingId === r._id}
                        onChange={(e) => handleStatusChange(r._id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DemoRequests;

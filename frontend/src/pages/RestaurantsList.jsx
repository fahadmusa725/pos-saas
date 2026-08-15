import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  KeyRound,
  Mail,
  Lock,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  subscriptionPlan: 'trial',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function RestaurantsList() {
  const [restaurants, setRestaurants]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);

  // Modals
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRest, setEditingRest]     = useState(null);
  const [addForm, setAddForm]             = useState(EMPTY_FORM);
  const [editForm, setEditForm]           = useState({
    name: '',
    phone: '',
    address: '',
    subscriptionPlan: 'trial',
    adminEmail: '',
  });

  // Password Reset Modal state
  const [resetTargetRest, setResetTargetRest] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Delete Danger Modal
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [confirmNameInput, setConfirmNameInput] = useState('');

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/restaurants');
      if (res.data.success) {
        setRestaurants(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load restaurants list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Create Restaurant Handler
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/super-admin/restaurants', addForm);
      if (res.data.success) {
        toast.success(`Restaurant '${addForm.name}' created successfully!`);
        setShowAddModal(false);
        setAddForm(EMPTY_FORM);
        fetchRestaurants();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Restaurant Handler
  const openEditModal = (rest) => {
    setEditingRest(rest);
    setEditForm({
      name: rest.name,
      phone: rest.phone || '',
      address: rest.address || '',
      subscriptionPlan: rest.subscriptionPlan || 'trial',
      adminEmail: rest.owner?.email || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/super-admin/restaurants/${editingRest._id}`, editForm);
      toast.success('Restaurant details & admin email updated!');
      setShowEditModal(false);
      setEditingRest(null);
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  // Password Reset Handler
  const openResetPasswordModal = (rest) => {
    setResetTargetRest(rest);
    setNewPasswordInput('');
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.trim().length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch(
        `/super-admin/restaurants/${resetTargetRest._id}/reset-admin-password`,
        { newPassword: newPasswordInput.trim() }
      );
      toast.success(res.data.message || 'Admin password reset successfully!');
      setResetTargetRest(null);
      setNewPasswordInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Suspend / Activate Toggle
  const handleToggleSuspend = async (rest) => {
    try {
      if (rest.isActive) {
        await api.patch(`/super-admin/restaurants/${rest._id}/suspend`);
        toast.success(`Restaurant '${rest.name}' suspended.`);
      } else {
        await api.patch(`/super-admin/restaurants/${rest._id}/activate`);
        toast.success(`Restaurant '${rest.name}' activated.`);
      }
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Permanent Delete Handler
  const openDeleteModal = (rest) => {
    setDeleteTarget(rest);
    setConfirmNameInput('');
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    if (confirmNameInput.trim() !== deleteTarget.name) {
      toast.error('Restaurant name does not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.delete(`/super-admin/restaurants/${deleteTarget._id}`);
      toast.success(`Restaurant '${deleteTarget.name}' & all associated data permanently deleted.`);
      setDeleteTarget(null);
      setConfirmNameInput('');
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Restaurants & Tenants
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage restaurant subscriptions, active status, and primary admin credentials
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No restaurants registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Restaurant</th>
                  <th className="px-6 py-3.5">Admin Email</th>
                  <th className="px-6 py-3.5">Plan</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Orders</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {restaurants.map((rest) => (
                  <tr key={rest._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="leading-tight font-bold">{rest.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{rest.owner?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                        {rest.subscriptionPlan || 'trial'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {rest.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      {rest.orderCount || 0}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleToggleSuspend(rest)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          rest.isActive
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {rest.isActive ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        onClick={() => openResetPasswordModal(rest)}
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                        title="Reset Admin Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openEditModal(rest)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openDeleteModal(rest)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Permanent Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD RESTAURANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Create New Restaurant</h2>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Lahore Karahi House"
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Plan *</label>
                  <select
                    value={addForm.subscriptionPlan}
                    onChange={(e) => setAddForm({ ...addForm, subscriptionPlan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Address</label>
                  <input
                    type="text"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    placeholder="Gulberg III, Lahore"
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Primary Admin Account</p>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Admin Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.adminName}
                    onChange={(e) => setAddForm({ ...addForm, adminName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Admin Email *</label>
                    <input
                      type="email"
                      required
                      value={addForm.adminEmail}
                      onChange={(e) => setAddForm({ ...addForm, adminEmail: e.target.value })}
                      placeholder="admin@restaurant.com"
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Admin Password *</label>
                    <input
                      type="password"
                      required
                      value={addForm.adminPassword}
                      onChange={(e) => setAddForm({ ...addForm, adminPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESTAURANT MODAL */}
      {showEditModal && editingRest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Edit Restaurant</h2>
              <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Primary Admin Email</label>
                <input
                  type="email"
                  required
                  value={editForm.adminEmail}
                  onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                  placeholder="admin@restaurant.com"
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Plan</label>
                <select
                  value={editForm.subscriptionPlan}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  <option value="trial">Trial</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    openResetPasswordModal(editingRest);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1.5 transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Admin Password</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-xl transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET ADMIN PASSWORD MODAL */}
      {resetTargetRest && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-500">
                <KeyRound className="w-5 h-5" />
                <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Reset Admin Password</h2>
              </div>
              <button
                onClick={() => {
                  setResetTargetRest(null);
                  setNewPasswordInput('');
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Set a new password for the primary admin user of <strong className="text-white">{resetTargetRest.name}</strong> ({resetTargetRest.owner?.email || 'admin'}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">New Password (min 6 characters) *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetRest(null);
                    setNewPasswordInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || newPasswordInput.trim().length < 6}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-extrabold rounded-xl transition"
                >
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DANGER CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Permanent Delete Warning</h2>
                <p className="text-xs text-rose-400">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              This action will permanently delete <strong className="text-white">{deleteTarget.name}</strong> and ALL associated data (Users, Menu Items, Orders, Inventory, Expenses, etc.).
            </p>

            <div className="space-y-1.5 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <label className="block text-[11px] text-neutral-400 font-medium">
                Type <strong className="text-amber-500">{deleteTarget.name}</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={(e) => setConfirmNameInput(e.target.value)}
                placeholder={deleteTarget.name}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmNameInput('');
                }}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={submitting || confirmNameInput.trim() !== deleteTarget.name}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-extrabold rounded-xl transition text-xs shadow-xs"
              >
                {submitting ? 'Deleting...' : 'PERMANENTLY DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestaurantsList;

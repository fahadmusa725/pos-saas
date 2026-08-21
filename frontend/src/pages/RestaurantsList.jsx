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
  Clock,
  Calendar,
} from 'lucide-react';

const getFutureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
};

const formatDateForInput = (dateVal) => {
  if (!dateVal) return getFutureDateStr(14);
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return getFutureDateStr(14);
  return d.toISOString().split('T')[0];
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  address: '',
  subscriptionPlan: 'basic',
  subscriptionStatus: 'trial',
  trialDurationOption: '14',
  trialEndsAt: getFutureDateStr(14),
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
  const [addForm, setAddForm]             = useState({
    ...EMPTY_FORM,
    trialEndsAt: getFutureDateStr(14),
  });
  const [editForm, setEditForm]           = useState({
    name: '',
    phone: '',
    address: '',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'active',
    trialDurationOption: '14',
    trialEndsAt: getFutureDateStr(14),
    adminEmail: '',
  });

  // Quick Trial Modal State
  const [quickTrialRest, setQuickTrialRest] = useState(null);
  const [quickTrialOption, setQuickTrialOption] = useState('14');
  const [quickTrialDate, setQuickTrialDate] = useState(getFutureDateStr(14));

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
      const payload = { ...addForm };
      if (payload.subscriptionStatus !== 'trial') {
        delete payload.trialEndsAt;
      }
      const res = await api.post('/super-admin/restaurants', payload);
      if (res.data.success) {
        toast.success(`Restaurant '${addForm.name}' created successfully!`);
        setShowAddModal(false);
        setAddForm({ ...EMPTY_FORM, trialEndsAt: getFutureDateStr(14) });
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
    const status = rest.subscriptionStatus || (rest.isActive ? 'active' : 'suspended');
    const trialDate = rest.trialEndsAt ? formatDateForInput(rest.trialEndsAt) : getFutureDateStr(14);

    setEditForm({
      name: rest.name,
      phone: rest.phone || '',
      address: rest.address || '',
      subscriptionPlan: rest.subscriptionPlan || 'basic',
      subscriptionStatus: status,
      trialDurationOption: '14',
      trialEndsAt: trialDate,
      adminEmail: rest.owner?.email || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...editForm };
      if (payload.subscriptionStatus !== 'trial') {
        payload.trialEndsAt = null;
      }
      await api.put(`/super-admin/restaurants/${editingRest._id}`, payload);
      toast.success('Restaurant details & subscription updated!');
      setShowEditModal(false);
      setEditingRest(null);
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Trial Modal Handler
  const openQuickTrialModal = (rest) => {
    setQuickTrialRest(rest);
    setQuickTrialOption('14');
    setQuickTrialDate(getFutureDateStr(14));
  };

  const handleQuickTrialSubmit = async (e) => {
    e.preventDefault();
    if (!quickTrialRest) return;
    setSubmitting(true);
    try {
      await api.put(`/super-admin/restaurants/${quickTrialRest._id}`, {
        subscriptionStatus: 'trial',
        trialEndsAt: quickTrialDate,
      });
      toast.success(`Trial set for '${quickTrialRest.name}' until ${quickTrialDate}!`);
      setQuickTrialRest(null);
      fetchRestaurants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set trial');
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
      if (rest.isActive && rest.subscriptionStatus !== 'suspended') {
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
            Manage restaurant subscriptions, active status, trial periods, and admin credentials
          </p>
        </div>
        <button
          onClick={() => {
            setAddForm({ ...EMPTY_FORM, trialEndsAt: getFutureDateStr(14) });
            setShowAddModal(true);
          }}
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
                        {rest.subscriptionPlan || 'basic'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {rest.subscriptionStatus === 'trial' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            Trial
                          </span>
                          {rest.trialEndsAt && (
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                              {(() => {
                                const daysLeft = Math.ceil(
                                  (new Date(rest.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)
                                );
                                const formattedDate = new Date(rest.trialEndsAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                                if (daysLeft > 0) {
                                  return `${daysLeft} day${daysLeft > 1 ? 's' : ''} left (${formattedDate})`;
                                } else if (daysLeft === 0) {
                                  return `Expires today (${formattedDate})`;
                                } else {
                                  return `Expired (${formattedDate})`;
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      ) : rest.isActive && rest.subscriptionStatus !== 'suspended' ? (
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
                        onClick={() => openQuickTrialModal(rest)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 inline-flex items-center gap-1"
                        title="Set / Extend Trial"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Trial</span>
                      </button>

                      <button
                        onClick={() => handleToggleSuspend(rest)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                          rest.isActive && rest.subscriptionStatus !== 'suspended'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {rest.isActive && rest.subscriptionStatus !== 'suspended' ? 'Suspend' : 'Activate'}
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

      {/* QUICK SET/EXTEND TRIAL MODAL */}
      {quickTrialRest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-base">
                <Clock className="w-5 h-5" />
                <span>Set / Extend Trial — {quickTrialRest.name}</span>
              </div>
              <button onClick={() => setQuickTrialRest(null)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickTrialSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                  Trial Duration Preset *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {['7', '14', '30', 'custom'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setQuickTrialOption(opt);
                        if (opt !== 'custom') {
                          setQuickTrialDate(getFutureDateStr(opt));
                        }
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                        quickTrialOption === opt
                          ? 'bg-amber-500 text-neutral-950 border-amber-500'
                          : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {opt === 'custom' ? 'Custom' : `${opt} Days`}
                    </button>
                  ))}
                </div>

                {quickTrialOption === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">
                      Custom Trial End Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={quickTrialDate}
                        onChange={(e) => setQuickTrialDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  Trial will end on <strong>{quickTrialDate || 'Selected Date'}</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickTrialRest(null)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold rounded-xl transition text-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Apply Trial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>

              {/* Status & Trial Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Initial Status *</label>
                  <select
                    value={addForm.subscriptionStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setAddForm({
                        ...addForm,
                        subscriptionStatus: newStatus,
                        trialEndsAt: newStatus === 'trial' ? getFutureDateStr(addForm.trialDurationOption !== 'custom' ? addForm.trialDurationOption : 14) : addForm.trialEndsAt,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {addForm.subscriptionStatus === 'trial' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Trial Duration *</label>
                    <select
                      value={addForm.trialDurationOption}
                      onChange={(e) => {
                        const opt = e.target.value;
                        setAddForm({
                          ...addForm,
                          trialDurationOption: opt,
                          trialEndsAt: opt !== 'custom' ? getFutureDateStr(opt) : addForm.trialEndsAt,
                        });
                      }}
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="custom">Custom Date</option>
                    </select>
                  </div>
                )}
              </div>

              {addForm.subscriptionStatus === 'trial' && addForm.trialDurationOption === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Exact Trial End Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.trialEndsAt}
                    onChange={(e) => setAddForm({ ...addForm, trialEndsAt: e.target.value })}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Plan</label>
                  <select
                    value={editForm.subscriptionPlan}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Status</label>
                  <select
                    value={editForm.subscriptionStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setEditForm({
                        ...editForm,
                        subscriptionStatus: newStatus,
                        trialEndsAt: newStatus === 'trial' ? getFutureDateStr(editForm.trialDurationOption !== 'custom' ? editForm.trialDurationOption : 14) : editForm.trialEndsAt,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {editForm.subscriptionStatus === 'trial' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Trial Duration</label>
                    <select
                      value={editForm.trialDurationOption}
                      onChange={(e) => {
                        const opt = e.target.value;
                        setEditForm({
                          ...editForm,
                          trialDurationOption: opt,
                          trialEndsAt: opt !== 'custom' ? getFutureDateStr(opt) : editForm.trialEndsAt,
                        });
                      }}
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="custom">Custom Date</option>
                    </select>
                  </div>

                  {editForm.trialDurationOption === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1">Trial End Date</label>
                      <input
                        type="date"
                        required
                        value={editForm.trialEndsAt}
                        onChange={(e) => setEditForm({ ...editForm, trialEndsAt: e.target.value })}
                        className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

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
                  <span>Reset Password</span>
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

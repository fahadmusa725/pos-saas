import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { APP_MODULES, DEFAULT_ROLE_PERMISSIONS } from '../config/modules';
import ConfirmModal from '../components/ConfirmModal';
import { Users, UserPlus, Shield, Key, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // ConfirmModal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier',
    password: '',
    autoGeneratePassword: true,
    permissions: DEFAULT_ROLE_PERMISSIONS['cashier'],
  });

  const [createdPasswordModal, setCreatedPasswordModal] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staff = null) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name,
        email: staff.email,
        role: staff.role,
        password: '',
        autoGeneratePassword: false,
        permissions: staff.permissions || DEFAULT_ROLE_PERMISSIONS[staff.role] || [],
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        role: 'cashier',
        password: '',
        autoGeneratePassword: true,
        permissions: DEFAULT_ROLE_PERMISSIONS['cashier'],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      role: 'cashier',
      password: '',
      autoGeneratePassword: true,
      permissions: DEFAULT_ROLE_PERMISSIONS['cashier'],
    });
  };

  const handleRoleChange = (newRole) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole] || [];
    setFormData({
      ...formData,
      role: newRole,
      permissions: defaultPerms,
    });
  };

  const handlePermissionToggle = (moduleId) => {
    const current = formData.permissions || [];
    let updated = [];
    if (current.includes(moduleId)) {
      updated = current.filter((id) => id !== moduleId);
    } else {
      updated = [...current, moduleId];
    }
    setFormData({ ...formData, permissions: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        const updatePayload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
        };
        if (formData.password) {
          updatePayload.password = formData.password;
        }
        await api.put(`/staff/${editingStaff._id}`, updatePayload);
        handleCloseModal();
        fetchStaff();
        toast.success('Staff member updated!');
      } else {
        const createPayload = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
        };
        if (!formData.autoGeneratePassword && formData.password) {
          createPayload.password = formData.password;
        }
        const res = await api.post('/staff', createPayload);
        handleCloseModal();
        fetchStaff();
        toast.success('Staff member created!');

        if (res.data.data?.generatedPassword) {
          setCreatedPasswordModal({
            email: res.data.data.email,
            password: res.data.data.generatedPassword,
          });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/staff/${id}/status`);
      fetchStaff();
      toast.success('Staff status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/staff/${deleteTargetId}`);
      setConfirmOpen(false);
      setDeleteTargetId(null);
      fetchStaff();
      toast.success('Staff member deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff member');
      setConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      cashier: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      waiter:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
      kitchen: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      manager: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${styles[role] || 'bg-neutral-500/10 text-neutral-500'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Staff Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage staff credentials, granular permissions, and activity status
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No staff members created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Permissions</th>
                  <th className="px-6 py-3.5">Orders Handled</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {staffList.map((member) => (
                  <tr key={member._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900 dark:text-white">{member.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(member.permissions || []).map((permId) => {
                          const moduleObj = APP_MODULES.find((m) => m.id === permId);
                          return (
                            <span
                              key={permId}
                              className="bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md text-[11px] font-medium border border-neutral-200 dark:border-neutral-800"
                            >
                              {moduleObj ? moduleObj.name : permId}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      {member.ordersCount} {member.ordersCount === 1 ? 'order' : 'orders'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(member._id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                          member.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {member.isActive ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                        title="Edit Staff"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(member._id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Staff"
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>

              {!editingStaff && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={formData.autoGeneratePassword}
                      onChange={(e) => setFormData({ ...formData, autoGeneratePassword: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>Auto-generate secure password</span>
                  </label>
                  {!formData.autoGeneratePassword && (
                    <input
                      type="password"
                      placeholder="Enter custom password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {/* Module Permissions Checkboxes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Module Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                  {APP_MODULES.filter((m) => m.id !== 'staff').map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.permissions || []).includes(m.id)}
                        onChange={() => handlePermissionToggle(m.id)}
                        className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition"
                >
                  {editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Password Result Modal */}
      {createdPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Credentials Created</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Save password for login:</p>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-950 font-mono text-sm rounded-xl font-bold text-amber-500 border border-neutral-200 dark:border-neutral-800">
              {createdPasswordModal.password}
            </div>
            <button
              onClick={() => setCreatedPasswordModal(null)}
              className="w-full py-2 bg-amber-500 font-bold text-neutral-950 rounded-xl text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Staff Member?"
        message="This action cannot be undone and will revoke all access for this user."
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

export default Staff;

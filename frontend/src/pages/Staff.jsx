import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { APP_MODULES, DEFAULT_ROLE_PERMISSIONS } from '../config/modules';
import ConfirmModal from '../components/ConfirmModal';

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      setError(err.response?.data?.message || 'Failed to fetch staff members');
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
      cashier: 'bg-green-100 text-green-800 border-green-200',
      waiter: 'bg-blue-100 text-blue-800 border-blue-200',
      kitchen: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${styles[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff roles, granular permissions, and performance tracking</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition text-sm flex items-center gap-2"
        >
          + Add Staff Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading staff members...</div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">No staff members found.</p>
            <p className="text-sm text-gray-400 mt-1">Add cashiers, waiters, or kitchen staff to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Modules</th>
                  <th className="py-3 px-4">Orders Handled</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {staffList.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(member.role)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(member.permissions || []).map((permId) => {
                          const moduleObj = APP_MODULES.find((m) => m.id === permId);
                          return (
                            <span
                              key={permId}
                              className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium border border-gray-200"
                            >
                              {moduleObj ? moduleObj.name : permId}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">
                      {member.ordersCount} {member.ordersCount === 1 ? 'order' : 'orders'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(member._id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition ${
                          member.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                        {member.isActive ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1 rounded hover:bg-blue-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(member._id)}
                        className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        Delete
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <h2 className="text-xl font-bold text-gray-900">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@restaurant.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Base Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none capitalize"
                >
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>

              {/* Granular Permissions Checklist */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase">
                  Module Permissions Checklist
                </label>
                <p className="text-xs text-gray-500">
                  Select which modules this staff member can access:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {APP_MODULES.map((module) => {
                    const isChecked = (formData.permissions || []).includes(module.id);
                    return (
                      <label
                        key={module.id}
                        className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePermissionToggle(module.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{module.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {!editingStaff && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 uppercase">Password Creation</label>
                    <label className="text-xs text-blue-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoGeneratePassword}
                        onChange={(e) => setFormData({ ...formData, autoGeneratePassword: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Auto-generate
                    </label>
                  </div>
                  {!formData.autoGeneratePassword && (
                    <input
                      type="password"
                      required={!formData.autoGeneratePassword}
                      minLength={6}
                      placeholder="Enter password (min 6 chars)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {editingStaff && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Leave blank to keep unchanged"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  {editingStaff ? 'Update Member' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {createdPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-900">Staff Created Successfully!</h3>
            <p className="text-xs text-gray-500">Please share these login credentials with the staff member:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-left space-y-1 font-mono text-sm">
              <div><span className="text-gray-500 text-xs">Email:</span> {createdPasswordModal.email}</div>
              <div><span className="text-gray-500 text-xs">Password:</span> <span className="font-bold text-blue-600">{createdPasswordModal.password}</span></div>
            </div>
            <button
              onClick={() => setCreatedPasswordModal(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
            >
              Done / Copied
            </button>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Staff Member?"
        message="This action cannot be undone and will revoke all access for this user."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTargetId(null); }}
      />
    </div>
  );
}

export default Staff;

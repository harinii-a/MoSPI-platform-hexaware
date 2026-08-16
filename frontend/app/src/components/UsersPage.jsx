import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { usersApi } from '../api';

export default function UsersPage({ currentUser }) {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'FIELD_SUPERVISOR',
    department: 'NSO Field Operations',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUserList(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersApi.create(newUser);
      setNewUser({
        username: '',
        password: '',
        name: '',
        role: 'FIELD_SUPERVISOR',
        department: 'NSO Field Operations',
      });
      fetchUsers();
    } catch (err) {
      console.error('Create user error:', err);
      alert(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (username) => {
    if (username === currentUser?.username) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Delete user ${username}?`)) return;
    try {
      await usersApi.delete(username);
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DATA_SUPERVISOR': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FIELD_SUPERVISOR': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ANALYST': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-black text-slate-900">User Management & Role Permissions</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Manage authenticated survey analysts, field supervisors, and administrators
          </p>
        </div>

        <span className="text-xs font-black bg-blue-100 text-blue-900 px-3.5 py-1.5 rounded-full border-2 border-slate-900 shadow-sketch-sm">
          {userList.length} Active Accounts
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create User Form */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-900 text-base">Provision New User</h3>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs font-bold">
            <div>
              <label className="block text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. Ramesh Varma"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="e.g. ramesh_v"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Role Permission Level</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
              >
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="DATA_SUPERVISOR">DATA_SUPERVISOR (Data & Validation)</option>
                <option value="FIELD_SUPERVISOR">FIELD_SUPERVISOR (Field Reviews)</option>
                <option value="ANALYST">ANALYST (Reporting & Analytics)</option>
                <option value="VIEWER">VIEWER (Read-Only)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Department / Branch</label>
              <input
                type="text"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                placeholder="e.g. NSO Chennai"
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 font-bold text-slate-900 shadow-sketch-sm"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl border-2 border-slate-900 shadow-sketch-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-900 shadow-sketch">
            <h3 className="font-black text-slate-900 text-base mb-4">Registered Platform Users</h3>

            <div className="space-y-3">
              {userList.map((u) => (
                <div
                  key={u.username}
                  className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-sketch-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black border-2 border-slate-900 shadow-sketch-sm">
                      {u.name?.charAt(0) || u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{u.name}</span>
                        <span className="text-xs text-slate-400 font-bold">(@{u.username})</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{u.department}</p>
                    </div>
                  </div>

                  {u.username !== currentUser?.username && (
                    <button
                      onClick={() => handleDeleteUser(u.username)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

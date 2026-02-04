import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import {
    Plus,
    Trash2,
    Edit2,
    Shield,
    User,
    X,
    Check,
    Search,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Mail,
    Calendar,
    Layers,
    Users,
    Lock,
    ShieldCheck,
    Settings
} from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeModalTab, setActiveModalTab] = useState('general');
    const { showSuccess, showError } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        permissions: ['read_only']
    });

    const PERMISSION_OPTIONS = [
        { value: 'admin', label: 'Admin', description: 'Full administrator access. Bypasses all other checks.' },
        { value: 'manage_users', label: 'Manage Users', description: 'Grant permission to manage other users.' },
        { value: 'manage_requests', label: 'Manage Requests', description: 'Manage and approve media requests.' },
        { value: 'request', label: 'Request', description: 'Submit requests for new music.' },
        { value: 'auto_approve', label: 'Auto-Approve', description: 'Automatic approval for music requests.' },
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            showError("Failed to fetch users: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const payload = { ...formData };
                if (!payload.password) delete payload.password;
                await api.put(`/users/${editingUser.id}`, payload);
                showSuccess("User updated successfully");
            } else {
                await api.post('/users', formData);
                showSuccess("User created successfully");
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ username: '', password: '', email: '', permissions: ['read_only'] });
            fetchUsers();
        } catch (error) {
            showError(error.response?.data?.error || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/users/${id}`);
            showSuccess("User deleted successfully");
            fetchUsers();
        } catch (error) {
            showError(error.response?.data?.error || "Failed to delete user");
        }
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === paginatedUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (id) => {
        const next = new Set(selectedUsers);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedUsers(next);
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                email: user.email || '',
                password: '',
                permissions: user.permissions
            });
        } else {
            setEditingUser(null);
            setFormData({ username: '', password: '', email: '', permissions: ['read_only'] });
        }
        setShowModal(true);
        setActiveModalTab('general');
    };

    const togglePermission = (perm) => {
        setFormData(prev => {
            const current = new Set(prev.permissions);
            if (current.has(perm)) current.delete(perm);
            else current.add(perm);
            return { ...prev, permissions: Array.from(current) };
        });
    }

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-500" />
                        User List
                    </h1>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your local users and their access permissions.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => openModal()}
                        className="btn btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Create Local User
                    </button>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all w-64 shadow-sm"
                        />
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                        checked={selectedUsers.size > 0 && selectedUsers.size === paginatedUsers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Requests</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                                            <span className="text-gray-500 font-medium">Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <User className="w-12 h-12 text-gray-300" />
                                            <span className="text-gray-500 font-medium">No users found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`group hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${selectedUsers.has(user.id) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                checked={selectedUsers.has(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getInitials(user.username)
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-gray-900 dark:text-white truncate">{user.username}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || 'No email provided'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.requestCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.authType === 'oidc' ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                    SSO User
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                    Local User
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <div className="flex gap-2">
                                                {user.permissions.map(p => (
                                                    <span
                                                        key={p}
                                                        className={`capitalize ${p === 'admin' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}
                                                    >
                                                        {p.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(user)}
                                                    className="btn border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-500 px-3 py-1.5 text-xs font-bold uppercase transition-all"
                                                >
                                                    Edit
                                                </button>
                                                <div className="relative group/tooltip">
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className={`btn border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-bold uppercase transition-all ${user.authType === 'oidc'
                                                            ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                                            : 'hover:bg-red-500 hover:border-red-500 hover:text-white'}`}
                                                        disabled={(user.permissions.includes('admin') && users.filter(u => u.permissions.includes('admin')).length <= 1) || user.authType === 'oidc'}
                                                    >
                                                        Delete
                                                    </button>
                                                    {user.authType === 'oidc' && (
                                                        <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                                                            Managed by SSO
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Section */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Showing <span className="text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-gray-900 dark:text-white">{filteredUsers.length}</span> results
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Display</span>
                                <select
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-1 focus:ring-primary-500"
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">results per page</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                            onClick={() => setShowModal(false)}
                        ></div>
                        <div className="relative bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
                            {/* Modal Header */}
                            <div className="p-8 pb-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-gray-900 overflow-hidden">
                                        {editingUser?.avatar ? (
                                            <img src={editingUser.avatar} alt={formData.username} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(formData.username || 'U')
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                            {formData.username || 'New User'}
                                            {formData.email && <span className="text-sm font-normal text-gray-400">({formData.email})</span>}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {editingUser ? `Joined ${new Date(editingUser.created_at).toLocaleDateString()} | User ID: ${editingUser.id.slice(0, 8)}` : 'Creating new user account'}
                                        </p>
                                    </div>
                                    <button onClick={() => setShowModal(false)} className="ml-auto p-2 hover:bg-gray-800 rounded-full transition-colors">
                                        <X className="w-6 h-6 text-gray-500" />
                                    </button>
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex gap-8 border-b border-gray-800">
                                    {[
                                        { id: 'general', label: 'General', icon: User },
                                        { id: 'password', label: 'Password', icon: Lock, hidden: editingUser?.authType === 'oidc' },
                                        { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
                                    ].filter(tab => !tab.hidden).map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveModalTab(tab.id)}
                                            className={`flex items-center gap-2 pb-4 text-sm font-medium transition-all relative ${activeModalTab === tab.id
                                                ? "text-primary-500"
                                                : "text-gray-500 hover:text-gray-300"
                                                }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                            {activeModalTab === tab.id && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="p-8 pt-6 max-h-[60vh] overflow-y-auto">
                                    {activeModalTab === 'general' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h4 className="text-xl font-bold text-white mb-6">General Settings</h4>

                                            {editingUser?.authType === 'oidc' && (
                                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                                                    <Shield className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <h5 className="text-sm font-bold text-blue-400">Managed by SSO</h5>
                                                        <p className="text-xs text-blue-300/80 mt-1">
                                                            This user account is managed by an external identity provider.
                                                            Email and password cannot be changed here.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Role</label>
                                                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700 text-gray-300 text-sm">
                                                        {formData.permissions.includes('admin') ? 'Administrator' : 'Aurral User'}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Account Type</label>
                                                    <div className="flex">
                                                        {editingUser?.authType === 'oidc' ? (
                                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                SSO User
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                Local User
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Display Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    disabled={editingUser?.authType === 'oidc'}
                                                    value={formData.username}
                                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                    className={`w-full bg-[#1f2937] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all ${editingUser?.authType === 'oidc' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    placeholder="e.g. mjohnson"
                                                    title={editingUser?.authType === 'oidc' ? "Managed by SSO provider" : ""}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                                                <input
                                                    type="email"
                                                    disabled={editingUser?.authType === 'oidc'}
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className={`w-full bg-[#1f2937] border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all ${editingUser?.authType === 'oidc' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    placeholder="user@example.com"
                                                    title={editingUser?.authType === 'oidc' ? "Managed by SSO provider" : ""}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeModalTab === 'password' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h4 className="text-xl font-bold text-white mb-6">Security Settings</h4>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                    New Password {editingUser && '(Leave blank to keep current)'}

                                                </label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input
                                                        type="password"
                                                        required={!editingUser}
                                                        value={formData.password}
                                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                        className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                    <Shield className="w-4 h-4 inline mr-2 text-primary-500" />
                                                    Aurral uses industry-standard hashing to keep your password secure. We recommend using a unique password for this service.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activeModalTab === 'permissions' && (
                                        <div className="space-y-6 animate-fade-in">
                                            <h4 className="text-xl font-bold text-white mb-6">Access Permissions</h4>

                                            <div className="space-y-4">
                                                {PERMISSION_OPTIONS.map(opt => (
                                                    <div
                                                        key={opt.value}
                                                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${formData.permissions.includes(opt.value)
                                                            ? "bg-primary-500/5 border-primary-500/30"
                                                            : "bg-gray-800/20 border-gray-800 hover:border-gray-700"
                                                            }`}
                                                        onClick={() => togglePermission(opt.value)}
                                                    >
                                                        <div className="pt-1">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.permissions.includes(opt.value)
                                                                ? "bg-primary-500 border-primary-500 text-white"
                                                                : "border-gray-600 bg-transparent"
                                                                }`}>
                                                                {formData.permissions.includes(opt.value) && <Check className="w-3.5 h-3.5" />}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm mb-1">{opt.label}</div>
                                                            <p className="text-xs text-gray-500">{opt.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 pt-4 bg-gray-900/50 border-t border-gray-800 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="btn btn-secondary flex-1 py-3"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary flex-1 py-3 shadow-lg shadow-primary-500/20"
                                    >
                                        {editingUser ? 'Save Changes' : 'Create User Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React from 'react';
import { Mail, Calendar, Lock, Shield } from 'lucide-react';

const ProfileHeader = ({ user, avatar }) => {
    const initials = user.username
        ? user.username.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'Recently';

    return (
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gray-900 dark:bg-black min-h-[280px] shadow-2xl group">
            {/* Premium Background Art */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black z-0"></div>
                {/* Abstract Blobs */}
                <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[600px] bg-primary-900/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-50%] right-[-20%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

                {/* Mesh Pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gray-950 to-transparent z-10" />

            <div className="relative z-20 h-full flex flex-col items-center justify-center pt-10 pb-10">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Avatar Ring */}
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-primary-500 to-indigo-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-white/5 bg-gray-800">
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-white text-5xl font-black tracking-tighter">
                                    {initials}
                                </div>
                            )}
                        </div>
                        {user.permissions.includes('admin') && (
                            <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white p-2 rounded-xl shadow-lg border-2 border-gray-900" title="Administrator">
                                <Shield className="w-5 h-5 fill-current" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                            {user.username}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-gray-300">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                                <Mail className="w-4 h-4 text-primary-400" />
                                <span>{user.email || 'No email set'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                                <Calendar className="w-4 h-4 text-primary-400" />
                                <span>Joined {joinDate}</span>
                            </div>
                            {user.authType === 'oidc' && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 backdrop-blur-md">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>SSO Account</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;

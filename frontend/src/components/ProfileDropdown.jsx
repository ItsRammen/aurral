import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, Settings, ListMusic, ChevronUp, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function ProfileDropdown() {
    const { user, logout, hasPermission } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const initials = user.username
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
        'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'
    ];

    const colorIndex = (user.id || user.username).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const avatarColor = colors[colorIndex];

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm group"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${avatarColor} flex items-center justify-center text-white text-sm font-bold shadow-sm transition-transform group-hover:scale-105`}>
                        {initials}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate w-full">
                            {user.username}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate w-full">
                            {user.permissions.includes('admin') ? 'Administrator' : 'Aurral User'}
                        </span>
                    </div>
                </div>
                <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 py-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {user.username}
                        </p>
                        {user.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {user.email}
                            </p>
                        )}
                    </div>

                    <div className="py-2">
                        <button
                            onClick={() => {
                                toggleTheme();
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                        </button>

                        <Link
                            to="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User className="w-4 h-4" />
                            Your Profile
                        </Link>
                        <Link
                            to="/requests"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <ListMusic className="w-4 h-4" />
                            My Requests
                        </Link>
                        {hasPermission('admin') && (
                            <Link
                                to="/settings"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Settings className="w-4 h-4" />
                                System Settings
                            </Link>
                        )}
                    </div>

                    <div className="py-2">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfileDropdown;

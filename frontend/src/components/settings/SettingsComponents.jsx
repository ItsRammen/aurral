import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

// URL validation helper
export const isValidUrl = (url) => {
    if (!url) return null;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Consistent settings card wrapper
 */
export function SettingsCard({ children, className = '' }) {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

/**
 * Card header with optional icon and status badge
 */
export function SettingsCardHeader({ icon: Icon, iconBg = 'bg-primary-100 dark:bg-primary-950/30', iconColor = 'text-primary-600 dark:text-primary-400', title, description, badge }) {
    return (
        <div className="flex items-center gap-4 mb-6">
            {Icon && (
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
            )}
            <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">{title}</h3>
                {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            {badge}
        </div>
    );
}

/**
 * Simple section title within a card
 */
export function SettingsSectionTitle({ children, className = '' }) {
    return (
        <h3 className={`text-lg font-black text-gray-900 dark:text-white mb-6 ${className}`}>
            {children}
        </h3>
    );
}

/**
 * Label for form fields
 */
export function SettingsLabel({ children, small = false }) {
    const sizeClass = small
        ? 'text-[10px]'
        : 'text-xs';
    return (
        <label className={`${sizeClass} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-1`}>
            {children}
        </label>
    );
}

/**
 * Text input with optional URL validation
 */
export function SettingsInput({
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    validateUrl = false,
    hint,
    className = '',
    wrapperClassName = ''
}) {
    const urlValid = validateUrl ? isValidUrl(value) : null;
    const showValidation = validateUrl && urlValid !== null;

    return (
        <div className={`space-y-1 ${wrapperClassName}`}>
            <div className="relative">
                <input
                    type={type}
                    disabled={disabled}
                    className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${showValidation ? (urlValid ? 'border-green-500 pr-10' : 'border-red-500 pr-10') : 'border-gray-200 dark:border-gray-700'
                        } ${className}`}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                {showValidation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {urlValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                    </div>
                )}
            </div>
            {hint && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1">{hint}</p>
            )}
        </div>
    );
}

/**
 * Toggle switch with label and description
 */
export function SettingsToggle({ checked, onChange, label, description, className = '' }) {
    return (
        <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl ${className}`}>
            <div>
                <h4 className="font-bold text-gray-900 dark:text-white">{label}</h4>
                {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked || false}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
        </div>
    );
}

/**
 * Row with toggle and custom content
 */
export function SettingsRow({ children, className = '' }) {
    return (
        <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl ${className}`}>
            {children}
        </div>
    );
}

/**
 * Status badge (Configured, Valid, Connected, etc.)
 */
export function StatusBadge({ status = 'success', children }) {
    const colorMap = {
        success: 'text-green-500 bg-green-500/10',
        warning: 'text-yellow-500 bg-yellow-500/10',
        error: 'text-red-500 bg-red-500/10',
        info: 'text-blue-500 bg-blue-500/10',
    };

    return (
        <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${colorMap[status]} px-2 py-1 rounded-full`}>
            {status === 'success' && <CheckCircle className="w-3 h-3" />}
            {children}
        </span>
    );
}

/**
 * Grid for form fields
 */
export function SettingsGrid({ cols = 2, children, className = '' }) {
    const colsClass = cols === 1 ? 'grid-cols-1' : `grid-cols-1 md:grid-cols-${cols}`;
    return (
        <div className={`grid ${colsClass} gap-6 ${className}`}>
            {children}
        </div>
    );
}

/**
 * Form field wrapper with label
 */
export function FormField({ label, small = false, children }) {
    return (
        <div className="space-y-2">
            <SettingsLabel small={small}>{label}</SettingsLabel>
            {children}
        </div>
    );
}

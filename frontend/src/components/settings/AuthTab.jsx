import React, { useState } from 'react';
import { ROLES } from '../../utils/permissions';
import { Shield, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { testOidcConnection } from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import {
    SettingsCard,
    SettingsCardHeader,
    SettingsSectionTitle,
    SettingsGrid,
    SettingsInput,
    SettingsToggle,
    FormField,
    isValidUrl
} from './SettingsComponents';

export default function AuthTab({ settings, handleUpdate }) {
    const { showSuccess, showError } = useToast();
    const [callbackType, setCallbackType] = useState('exact');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testingOidc, setTestingOidc] = useState(false);
    const [oidcValid, setOidcValid] = useState(null);

    const handleTestOidc = async (e) => {
        e.preventDefault();
        if (!settings.oidcIssuerUrl) {
            showError("Please enter an Issuer URL first");
            return;
        }
        setTestingOidc(true);
        setOidcValid(null);
        try {
            const result = await testOidcConnection(settings.oidcIssuerUrl);
            setOidcValid(true);
            showSuccess("Discovery Successful");
            // Auto-fill endpoints if they are empty
            if (!settings.oidcAuthorizationUrl && result.config.authorization_endpoint) {
                handleUpdate("oidcAuthorizationUrl", result.config.authorization_endpoint);
            }
            if (!settings.oidcTokenUrl && result.config.token_endpoint) {
                handleUpdate("oidcTokenUrl", result.config.token_endpoint);
            }
        } catch (err) {
            setOidcValid(false);
            showError(err.response?.data?.error || "OIDC Discovery Failed");
        } finally {
            setTestingOidc(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* OIDC Configuration */}
            <SettingsCard>
                <SettingsCardHeader
                    icon={Shield}
                    title="Authentication"
                    description="Configure external identity providers (OIDC/OAuth2)."
                />

                <div className="space-y-6">
                    <SettingsToggle
                        checked={settings.oidcEnabled}
                        onChange={(val) => handleUpdate("oidcEnabled", val)}
                        label="Enable OpenID Connect"
                        description="Allow users to log in with an external provider (e.g., Authentik, Authelia)."
                    />

                    {settings.oidcEnabled && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                            <FormField label="Issuer URL">
                                <div className="flex gap-2 items-start">
                                    <SettingsInput
                                        type="url"
                                        value={settings.oidcIssuerUrl}
                                        onChange={(val) => {
                                            handleUpdate("oidcIssuerUrl", val);
                                            setOidcValid(null);
                                        }}
                                        placeholder="https://auth.example.com/application/o/aurral/"
                                        validateUrl
                                        hint="Base URL of your IdP application."
                                        wrapperClassName="flex-1"
                                    />
                                    <button
                                        onClick={handleTestOidc}
                                        disabled={testingOidc || !settings.oidcIssuerUrl}
                                        className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${oidcValid === true
                                            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                            : oidcValid === false
                                                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                                : "bg-primary-500/10 text-primary-500 hover:bg-primary-500/20"
                                            }`}
                                    >
                                        {testingOidc ? <Loader className="w-4 h-4 animate-spin" /> :
                                            oidcValid === true ? <CheckCircle className="w-4 h-4" /> :
                                                oidcValid === false ? <AlertCircle className="w-4 h-4" /> :
                                                    <Shield className="w-4 h-4" />}
                                        {testingOidc ? "Testing..." : "Test"}
                                    </button>
                                </div>
                            </FormField>

                            <SettingsGrid cols={2}>
                                <FormField label="Client ID">
                                    <SettingsInput
                                        value={settings.oidcClientId}
                                        onChange={(val) => handleUpdate("oidcClientId", val)}
                                        placeholder="aurral-client-id"
                                    />
                                </FormField>
                                <FormField label="Client Secret">
                                    <SettingsInput
                                        type="password"
                                        value={settings.oidcClientSecret}
                                        onChange={(val) => handleUpdate("oidcClientSecret", val)}
                                        placeholder="••••••••••••••••"
                                    />
                                </FormField>
                            </SettingsGrid>

                            {/* Collapsible Advanced Section */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                <CollapsibleSection
                                    title="Advanced Overrides"
                                    description="Only set these if auto-discovery fails or you need custom endpoints."
                                    open={showAdvanced}
                                    onToggle={() => setShowAdvanced(!showAdvanced)}
                                >
                                    <SettingsGrid cols={2} className="mt-4">
                                        <FormField label="Auth URL" small>
                                            <SettingsInput
                                                value={settings.oidcAuthorizationUrl}
                                                onChange={(val) => handleUpdate("oidcAuthorizationUrl", val)}
                                                placeholder="Leave empty for auto-discovery"
                                                className="text-xs py-2"
                                            />
                                        </FormField>
                                        <FormField label="Token URL" small>
                                            <SettingsInput
                                                value={settings.oidcTokenUrl}
                                                onChange={(val) => handleUpdate("oidcTokenUrl", val)}
                                                placeholder="Leave empty for auto-discovery"
                                                className="text-xs py-2"
                                            />
                                        </FormField>
                                        <FormField label="User Info URL" small>
                                            <SettingsInput
                                                value={settings.oidcUserInfoUrl}
                                                onChange={(val) => handleUpdate("oidcUserInfoUrl", val)}
                                                placeholder="Leave empty for auto-discovery"
                                                className="text-xs py-2"
                                            />
                                        </FormField>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Callback URL (Read Only)</label>
                                                <CallbackTypeToggle value={callbackType} onChange={setCallbackType} />
                                            </div>
                                            <input
                                                type="text"
                                                disabled
                                                className="w-full bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs text-gray-500 cursor-not-allowed font-mono"
                                                value={callbackType === 'exact'
                                                    ? `${window.location.protocol}//${window.location.hostname}:3001/api/auth/oidc/callback`
                                                    : `^http://.*:3001/api/auth/oidc/callback$`
                                                }
                                            />
                                        </div>
                                    </SettingsGrid>
                                </CollapsibleSection>
                            </div>
                        </div>
                    )}
                </div>
            </SettingsCard>

            {/* Default Permissions */}
            <SettingsCard>
                <SettingsSectionTitle>Default User Role</SettingsSectionTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 -mt-4">
                    Choose the role assigned to new users when they first sign up or are created.
                </p>

                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(ROLES).map(([roleKey, rolePerms]) => (
                        <RoleSelectionCard
                            key={roleKey}
                            label={roleKey.toLowerCase().replace('_', ' ')}
                            permissions={rolePerms}
                            currentPermissions={settings.defaultPermissions || []}
                            onSelect={(perms) => handleUpdate("defaultPermissions", perms)}
                        />
                    ))}
                </div>
            </SettingsCard>
        </section>
    );
}

// Helper Components
function RoleSelectionCard({ label, permissions, currentPermissions, onSelect }) {
    // Check if current permissions match this role exactly
    const isSelected =
        currentPermissions.length === permissions.length &&
        permissions.every(p => currentPermissions.includes(p));

    return (
        <button
            type="button"
            onClick={() => onSelect(permissions)}
            className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected
                ? "bg-primary-500/10 border-primary-500 ring-1 ring-primary-500"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary-500" : "border-gray-300 dark:border-gray-600"
                    }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                </div>
                <div>
                    <span className="font-bold text-gray-900 dark:text-white capitalize block">
                        {label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {permissionSummary(permissions)}
                    </span>
                </div>

            </div>
            {isSelected && <CheckCircle className="w-5 h-5 text-primary-500" />}
        </button>
    );
}

function permissionSummary(perms) {
    if (perms.length === 0) return "Read-only access";
    if (perms.includes('admin')) return "Full system access";
    return `${perms.length} permission${perms.length !== 1 ? 's' : ''}`;
}

function CollapsibleSection({ title, description, open, onToggle, children }) {
    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="flex items-center justify-between w-full text-left group"
            >
                <div>
                    <h5 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {title}
                    </h5>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/20 transition-colors">
                    {open ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                    )}
                </div>
            </button>
            {open && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </>
    );
}

function CallbackTypeToggle({ value, onChange }) {
    return (
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {['exact', 'regex'].map((type) => (
                <button
                    key={type}
                    type="button"
                    onClick={() => onChange(type)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all capitalize ${value === type
                        ? 'bg-white dark:bg-gray-700 text-primary-500 shadow-sm'
                        : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    {type}
                </button>
            ))}
        </div>
    );
}

function PermissionRow({ label, description, checked, onChange }) {
    return (
        <label className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all cursor-pointer border border-transparent hover:border-primary-500/20">
            <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white">{label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
            </div>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked || false}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </div>
        </label>
    );
}

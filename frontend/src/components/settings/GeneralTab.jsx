import React from 'react';
import {
    SettingsCard,
    SettingsSectionTitle,
    SettingsGrid,
    SettingsInput,
    FormField
} from './SettingsComponents';

export default function GeneralTab({ settings, handleUpdate }) {
    return (
        <section className="space-y-6">
            <SettingsCard>
                <SettingsSectionTitle>Application Settings</SettingsSectionTitle>

                <SettingsGrid cols={2}>
                    <FormField label="Application Title">
                        <SettingsInput
                            value={settings.appName}
                            onChange={(val) => handleUpdate("appName", val)}
                            placeholder="Aurral"
                        />
                    </FormField>

                    <FormField label="Application URL">
                        <SettingsInput
                            value={settings.appUrl}
                            onChange={(val) => handleUpdate("appUrl", val)}
                            placeholder="https://aurral.yourdomain.com"
                            validateUrl
                        />
                    </FormField>
                </SettingsGrid>

                <SettingsGrid cols={2} className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <FormField label="Contact Email">
                        <SettingsInput
                            type="email"
                            value={settings.contactEmail}
                            onChange={(val) => handleUpdate("contactEmail", val)}
                            placeholder="user@example.com"
                            hint="Used for MusicBrainz identification"
                        />
                    </FormField>

                    <FormField label="Version">
                        <div className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 px-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                            v{__APP_VERSION__}
                        </div>
                    </FormField>
                </SettingsGrid>
            </SettingsCard>
        </section>
    );
}

import { useState, useEffect } from "react";
import { X, Loader, Save, Settings, AlertCircle } from "lucide-react";
import {
    updateLidarrArtist,
} from "../utils/api";

function ArtistSettingsModal({ artist, qualityProfiles, metadataProfiles, onClose, onSuccess, showError }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [monitored, setMonitored] = useState(artist?.monitored ?? true);
    const [qualityProfileId, setQualityProfileId] = useState(artist?.qualityProfileId || "");
    const [metadataProfileId, setMetadataProfileId] = useState(artist?.metadataProfileId || "");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const updatedData = {
                ...artist,
                monitored,
                qualityProfileId: parseInt(qualityProfileId),
                metadataProfileId: parseInt(metadataProfileId),
            };

            const result = await updateLidarrArtist(artist.id, updatedData);
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update artist settings");
            if (showError) showError("Failed to update artist settings");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary-500" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Artist Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 flex items-start">
                            <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Quality Profile
                            </label>
                            <select
                                value={qualityProfileId}
                                onChange={(e) => setQualityProfileId(e.target.value)}
                                className="input"
                                disabled={submitting}
                            >
                                {qualityProfiles.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Metadata Profile
                            </label>
                            <select
                                value={metadataProfileId}
                                onChange={(e) => setMetadataProfileId(e.target.value)}
                                className="input"
                                disabled={submitting}
                            >
                                {metadataProfiles.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                                <input
                                    type="checkbox"
                                    checked={monitored}
                                    onChange={(e) => setMonitored(e.target.checked)}
                                    className="w-5 h-5 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded focus:ring-primary-500"
                                    disabled={submitting}
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Monitored
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Search for and track new releases
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary flex-1"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ArtistSettingsModal;

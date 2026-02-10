import React, { useState } from "react";
import { X, AlertTriangle, Send } from "lucide-react";
import api from "../utils/api";
import { useToast } from "../contexts/ToastContext";

/**
 * ReportIssueModal - Allows users to report issues/problems with albums or artists
 */
function ReportIssueModal({ isOpen, onClose, artist, album }) {
    const [issueType, setIssueType] = useState("quality_issue");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { showSuccess, showError } = useToast();

    if (!isOpen) return null;

    const issueTypes = [
        { id: "quality_issue", label: "Quality Issue", description: "Audio quality problems" },
        { id: "wrong_content", label: "Wrong Content", description: "Wrong album/tracks" },
        { id: "missing_tracks", label: "Missing Tracks", description: "Some tracks are missing" },
        { id: "download_stuck", label: "Download Stuck", description: "Download not progressing" },
        { id: "other", label: "Other", description: "Other issue" },
    ];

    const handleSubmit = async () => {
        if (!message.trim()) {
            showError("Please describe the issue");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/issues", {
                type: issueType,
                severity: "warning",
                title: album
                    ? `${issueTypes.find(t => t.id === issueType)?.label}: ${album.title}`
                    : `${issueTypes.find(t => t.id === issueType)?.label}: ${artist?.artistName || "Unknown"}`,
                message: message.trim(),
                artistId: artist?.id,
                artistName: artist?.artistName,
                artistMbid: artist?.foreignArtistId,
                albumId: album?.id,
                albumTitle: album?.title,
            });

            showSuccess("Issue reported - admin will review it");
            onClose();
        } catch (error) {
            showError("Failed to report issue");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Report Issue
                            </h2>
                            <p className="text-xs text-gray-500">
                                {album ? album.title : artist?.artistName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Issue Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Issue Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {issueTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setIssueType(type.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${issueType === type.id
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                        }`}
                                >
                                    <p className={`text-sm font-medium ${issueType === type.id
                                        ? "text-primary-700 dark:text-primary-400"
                                        : "text-gray-700 dark:text-gray-300"
                                        }`}>
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the issue in detail..."
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !message.trim()}
                        className="flex items-center gap-2 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {submitting ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReportIssueModal;

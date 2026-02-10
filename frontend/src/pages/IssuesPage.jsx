import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Clock,
    Music,
    RotateCw,
    Trash2,
    Eye,
    EyeOff,
    Filter,
} from "lucide-react";
import api from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";
import TabNav from "../components/TabNav";
import LoadingSpinner from "../components/LoadingSpinner";

function IssuesPage() {
    const [issues, setIssues] = useState([]);
    const [counts, setCounts] = useState({ open: 0, resolved: 0, ignored: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("open");
    const [actionLoading, setActionLoading] = useState(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [total, setTotal] = useState(0);
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const fetchIssues = async () => {
        try {
            const offset = (page - 1) * limit;
            const response = await api.get(`/issues?status=${activeTab}&limit=${limit}&offset=${offset}`);
            setIssues(response.data.issues);
            setCounts(response.data.counts);
            setTotal(response.data.total);
        } catch (error) {
            showError("Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchIssues();
    }, [activeTab, page]);

    // Reset page when tab changes
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    const totalPages = Math.ceil(total / limit);

    const handleUpdateStatus = async (id, status) => {
        setActionLoading(id);
        try {
            await api.patch(`/issues/${id}`, { status });
            showSuccess(`Issue ${status === "resolved" ? "resolved" : status === "ignored" ? "ignored" : "reopened"}`);
            fetchIssues();
        } catch (error) {
            showError("Failed to update issue");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRetry = async (issue) => {
        setActionLoading(issue.id);
        try {
            await api.post(`/issues/${issue.id}/retry`);
            showSuccess("Retry triggered - searching for new sources");
            fetchIssues();
        } catch (error) {
            showError("Failed to retry");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(id);
        try {
            await api.delete(`/issues/${id}`);
            showSuccess("Issue deleted");
            fetchIssues();
        } catch (error) {
            showError("Failed to delete issue");
        } finally {
            setActionLoading(null);
        }
    };

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case "error":
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "warning":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            default:
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case "download_failed":
                return "Download Failed";
            case "import_failed":
                return "Import Failed";
            case "stuck_download":
                return "Stuck Download";
            default:
                return type;
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading issues..." />;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <PageHeader
                title="Issues"
                subtitle="Track and resolve download problems"
                icon={AlertTriangle}
            />

            <TabNav
                tabs={[
                    { id: "open", label: "Open", badge: counts.open },
                    { id: "resolved", label: "Resolved", badge: counts.resolved },
                    { id: "ignored", label: "Ignored", badge: counts.ignored },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="mb-6"
            />

            {issues.length === 0 ? (
                <div className="card text-center py-16">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                        No {activeTab} Issues
                    </h3>
                    <p className="text-gray-500">
                        {activeTab === "open"
                            ? "All downloads are running smoothly!"
                            : `No ${activeTab} issues to show.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {issues.map((issue) => (
                        <div
                            key={issue.id}
                            className="card border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start gap-4">
                                {/* Severity indicator */}
                                <div className={`p-2 rounded-lg ${getSeverityStyles(issue.severity)}`}>
                                    {issue.severity === "error" ? (
                                        <XCircle className="w-5 h-5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            {issue.title}
                                        </h3>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                            {getTypeLabel(issue.type)}
                                        </span>
                                    </div>

                                    {issue.artistName && (
                                        <p
                                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer mb-1"
                                            onClick={() => navigate(`/artist/${issue.artistMbid}`)}
                                        >
                                            {issue.artistName}
                                            {issue.albumTitle && ` • ${issue.albumTitle}`}
                                        </p>
                                    )}

                                    {issue.message && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            {issue.message}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </span>
                                        {issue.retryAttempts > 0 && (
                                            <span className="flex items-center gap-1 text-yellow-600">
                                                <RotateCw className="w-3 h-3" />
                                                {issue.retryAttempts} retries
                                            </span>
                                        )}
                                        {issue.resolvedBy && (
                                            <span className="text-green-600">
                                                Resolved by {issue.resolvedBy}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {issue.status === "open" && issue.type === "download_failed" && (
                                        <button
                                            onClick={() => handleRetry(issue)}
                                            disabled={actionLoading === issue.id}
                                            className="btn btn-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                                            title="Retry download"
                                        >
                                            {actionLoading === issue.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <RotateCw className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}

                                    {issue.status === "open" && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(issue.id, "resolved")}
                                                disabled={actionLoading === issue.id}
                                                className="btn btn-sm bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                                title="Mark as resolved"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(issue.id, "ignored")}
                                                disabled={actionLoading === issue.id}
                                                className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                                title="Ignore"
                                            >
                                                <EyeOff className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}

                                    {issue.status !== "open" && (
                                        <button
                                            onClick={() => handleUpdateStatus(issue.id, "open")}
                                            disabled={actionLoading === issue.id}
                                            className="btn btn-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                                            title="Reopen"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(issue.id)}
                                        disabled={actionLoading === issue.id}
                                        className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {issues.length > 0 && (
                <div className="flex justify-between items-center mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} issues
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="btn btn-sm btn-ghost"
                        >
                            Previous
                        </button>
                        <div className="flex items-center px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Page {page} of {totalPages}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="btn btn-sm btn-ghost"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IssuesPage;

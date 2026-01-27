import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Music,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Check,
  XSquare,
} from "lucide-react";
import { getRequests, deleteRequest, approveRequest, denyRequest } from "../utils/api";
import ArtistImage from "../components/ArtistImage";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeTab, setActiveTab] = useState("my");
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user, hasPermission } = useAuth();

  const fetchRequests = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError("Failed to load requests history.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async (mbid, name) => {
    if (
      window.confirm(
        `Are you sure you want to remove the request for "${name}" from your history?`,
      )
    ) {
      try {
        await deleteRequest(mbid);
        setRequests((prev) => prev.filter((r) => r.mbid !== mbid));
      } catch (err) {
        showError("Failed to delete request");
      }
    }
  };

  const handleApprove = async (id, name) => {
    setPendingAction(id);
    try {
      await approveRequest(id);
      showSuccess(`Approved request for ${name}`);
      fetchRequests(true);
    } catch (error) {
      showError("Failed to approve request: " + error.response?.data?.error || error.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeny = async (id, name) => {
    if (!window.confirm(`Deny request for ${name}?`)) return;
    setPendingAction(id);
    try {
      await denyRequest(id);
      showSuccess(`Denied request for ${name}`);
      fetchRequests(true);
    } catch (error) {
      showError("Failed to deny request");
    } finally {
      setPendingAction(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "available":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Available
          </span>
        );
      case "processing":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case "pending_approval":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
      case "denied":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XSquare className="w-3.5 h-3.5" />
            Denied
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3.5 h-3.5" />
            Requested
          </span>
        );
    }
  };

  const getFilteredRequests = () => {
    if (activeTab === "pending") {
      return requests.filter(r => r.status === "pending_approval");
    }
    if (activeTab === "my") {
      return requests.filter(r => r.requestedByUserId === user?.id);
    }
    return requests; // "all" tab
  };

  const filteredRequests = getFilteredRequests();
  const pendingCount = requests.filter(r => r.status === "pending_approval").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          Loading your requests...
        </h2>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Requests
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {hasPermission('admin') ? "Manage and track artist requests" : "Track your artist requests and their availability"}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchRequests(true)}
          disabled={refreshing}
          className="btn btn-secondary flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh Status
        </button>
      </div>

      {hasPermission('admin') && (
        <div className="flex space-x-1 sm:space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
          <button
            className={`pb-2 px-2 sm:px-4 font-medium transition-colors whitespace-nowrap ${activeTab === 'my' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('my')}
          >
            My Requests
          </button>
          <button
            className={`pb-2 px-2 sm:px-4 font-medium transition-colors whitespace-nowrap ${activeTab === 'all' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('all')}
          >
            All Requests
          </button>
          <button
            className={`pb-2 px-2 sm:px-4 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'pending' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
            {pendingCount > 0 && (
              <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-orange-900 dark:text-orange-200">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {!hasPermission('admin') && (
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">My Requests</h2>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-center gap-3 mb-8">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="card text-center py-20">
          <Music className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Requests Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {activeTab === 'pending' ? "No requests waiting for approval." : "You haven't requested any artists yet."}
          </p>
          {activeTab === 'all' && (
            <button onClick={() => navigate("/")} className="btn btn-primary">
              Start Discovering
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id || request.mbid}
              className="card group hover:shadow-md transition-all border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 min-w-0"
            >
              <div
                className="w-24 h-24 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => navigate(`/artist/${request.mbid}`)}
              >
                <ArtistImage
                  src={request.image}
                  mbid={request.mbid}
                  alt={request.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1 min-w-0">
                  <h3
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-primary-500 cursor-pointer truncate"
                    onClick={() => navigate(`/artist/${request.mbid}`)}
                  >
                    {request.name}
                  </h3>
                  <div className="flex justify-center sm:justify-start">
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-col gap-1 min-w-0">
                  <span className="flex items-center justify-center sm:justify-start gap-1 truncate">
                    <Clock className="w-3.5 h-3.5" />
                    Requested on{" "}
                    {new Date(request.requestedAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                    {request.requestedBy && (activeTab === 'all' || activeTab === 'pending') && (
                      <span className="text-primary-600 dark:text-primary-400 font-medium"> by {request.requestedBy === user?.username ? "You" : request.requestedBy}</span>
                    )}
                  </span>
                  {request.status === 'denied' && (
                    <span className="text-red-500 text-xs font-medium">Denied by {request.deniedBy}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                {hasPermission('admin') && request.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => handleApprove(request.id, request.name)}
                      className="btn bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 flex items-center gap-1 btn-sm"
                      disabled={pendingAction === request.id}
                    >
                      {pendingAction === request.id ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(request.id, request.name)}
                      className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 flex items-center gap-1 btn-sm"
                      disabled={pendingAction === request.id}
                    >
                      {pendingAction === request.id ? <Loader className="w-4 h-4 animate-spin" /> : <XSquare className="w-4 h-4" />}
                      Deny
                    </button>
                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                  </>
                )}

                <button
                  onClick={() => navigate(`/artist/${request.mbid}`)}
                  className="p-2.5 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                  title="View Artist"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(request.mbid, request.name)}
                  className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  title="Remove from history"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 p-6 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-500/10">
        <h4 className="font-bold text-primary-900 dark:text-primary-400 mb-2">
          Request Status Guide
        </h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex gap-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
            <p>
              <strong>Pending:</strong> Awaiting admin approval.
            </p>
          </div>
          <div className="flex gap-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0"></div>
            <p>
              <strong>Requested:</strong> Added to Lidarr, awaiting monitoring.
            </p>
          </div>
          <div className="flex gap-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
            <p>
              <strong>Processing:</strong> Lidarr has found content.
            </p>
          </div>
          <div className="flex gap-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
            <p>
              <strong>Available:</strong> Content is ready to play.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestsPage;

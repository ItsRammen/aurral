import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader,
  Music,
  ExternalLink,
  CheckCircle,
  Plus,
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  Sparkles,
  XCircle,
  Layout as LayoutIcon,
  RefreshCcw,
  Settings,
  Save,
  Heart,
  Clock,
  Search,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  getArtistDetails,
  getArtistCover,
  lookupArtistInLidarr,
  getLidarrAlbums,
  updateLidarrAlbum,
  searchLidarrAlbum,
  getSimilarArtistsForArtist,
  lookupArtistsInLidarrBatch,
  checkHealth,
  monitorLidarrAlbums,
  runLidarrCommand,
  getLidarrQualityProfiles,
  getLidarrMetadataProfiles,
  updateLidarrArtist,
  toggleLikeArtist,
  getLikedArtists,
  getNavidromeStatus,
  getNavidromePlaybackUrl,
} from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePlayer } from "../contexts/PlayerContext";
import AddArtistModal from "../components/AddArtistModal";
import ArtistSettingsModal from "../components/ArtistSettingsModal";
import AlbumTracksModal from "../components/AlbumTracksModal";
import ArtistImage from "../components/ArtistImage";

function ArtistDetailsPage() {
  const { mbid } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [coverImages, setCoverImages] = useState([]);
  const [lidarrArtist, setLidarrArtist] = useState(null);
  const [lidarrAlbums, setLidarrAlbums] = useState([]);
  const [similarArtists, setSimilarArtists] = useState([]);
  const [existingSimilar, setExistingSimilar] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState(null);
  const [existsInLidarr, setExistsInLidarr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [artistToAdd, setArtistToAdd] = useState(null);
  const [requestingAlbum, setRequestingAlbum] = useState(null);
  const [unmonitoringAlbum, setUnmonitoringAlbum] = useState(null);
  const [batchMonitoring, setBatchMonitoring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lidarrLoading, setLidarrLoading] = useState(false);
  const [lidarrError, setLidarrError] = useState(null);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [metadataProfiles, setMetadataProfiles] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAlbumForDetails, setSelectedAlbumForDetails] = useState(null);
  const [health, setHealth] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [releaseSearch, setReleaseSearch] = useState("");
  const [releaseSort, setReleaseSort] = useState("year-desc");
  const [activeReleaseTab, setActiveReleaseTab] = useState("all");
  const [navidromeConnected, setNavidromeConnected] = useState(false);
  const [playingOnNavidrome, setPlayingOnNavidrome] = useState(null);
  const { showSuccess, showError } = useToast();
  const { play } = usePlayer();
  const { user } = useAuth();

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [artistData, healthData, qProfiles, mProfiles, likedMbids] = await Promise.all([
          getArtistDetails(mbid),
          checkHealth(),
          getLidarrQualityProfiles(),
          getLidarrMetadataProfiles(),
          getLikedArtists()
        ]);
        setArtist(artistData);
        setHealth(healthData);
        setQualityProfiles(qProfiles);
        setMetadataProfiles(mProfiles);
        setIsLiked(likedMbids.includes(mbid));

        try {
          const similarData = await getSimilarArtistsForArtist(mbid);
          setSimilarArtists(similarData.artists || []);
          if (similarData.artists?.length > 0) {
            const similarMbids = similarData.artists.map((a) => a.id);
            const existingMap = await lookupArtistsInLidarrBatch(similarMbids);
            setExistingSimilar(existingMap);
          }
        } catch (err) {
          console.error("Failed to fetch similar artists:", err);
        }

        try {
          const coverData = await getArtistCover(mbid);
          if (coverData.images && coverData.images.length > 0) {
            setCoverImages(coverData.images);
          }
        } catch (err) {
          console.log("No cover art available");
        }
        try {
          const lookup = await lookupArtistInLidarr(mbid);
          setExistsInLidarr(lookup.exists);
          if (lookup.exists && lookup.artist) {
            setLidarrArtist(lookup.artist);
            fetchLidarrData(lookup.artist.id);
          }
          if (lookup.request) {
            setPendingRequest(lookup.request);
          }
        } catch (err) {
          console.error("Failed to lookup artist in Lidarr:", err);
          setLidarrError("Failed to connect to Lidarr");
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch artist details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [mbid]);

  useEffect(() => {
    const checkNavi = async () => {
      try {
        const status = await getNavidromeStatus();
        setNavidromeConnected(status.connected);
      } catch (e) {
        console.error("Navidrome status check failed:", e);
      }
    };
    checkNavi();
  }, []);

  const fetchLidarrData = async (artistId) => {
    if (!artistId) return;

    setLidarrLoading(true);
    setLidarrError(null);

    try {
      // Small delay to allow Lidarr to process if just added/refreshed
      await new Promise(resolve => setTimeout(resolve, 500));
      const albums = await getLidarrAlbums(artistId);
      setLidarrAlbums(albums);
      setLidarrError(null);
    } catch (err) {
      console.error("Failed to fetch Lidarr albums:", err);
      setLidarrError("Failed to fetch albums from Lidarr");
    } finally {
      setLidarrLoading(false);
    }
  };

  const handleAddArtistClick = () => {
    setShowAddModal(true);
  };

  const handleAddSuccess = async (addedArtist, response) => {
    if (response?.pending) {
      setPendingRequest({
        ...addedArtist,
        requestedBy: "You", // Or fetch current user
        status: "pending_approval"
      });
      showSuccess(`Request for ${addedArtist.name} submitted for admin approval.`);
    } else {
      setExistsInLidarr(true);
      showSuccess(`Successfully added ${addedArtist.name} to Lidarr!`);
    }

    setShowAddModal(false);
    setArtistToAdd(null);

    if (addedArtist.id) {
      setExistingSimilar((prev) => ({ ...prev, [addedArtist.id]: true }));
    }

    setTimeout(async () => {
      try {
        const lookup = await lookupArtistInLidarr(mbid);
        if (lookup.exists && lookup.artist) {
          setLidarrArtist(lookup.artist);
          fetchLidarrData(lookup.artist.id);
        }
      } catch (err) {
        console.error("Failed to refresh Lidarr data", err);
      }
    }, 1500);
  };


  const handleUnmonitorAlbum = async (albumId, title) => {
    if (!window.confirm(`Are you sure you want to stop monitoring "${title}"?`)) return;

    setUnmonitoringAlbum(albumId);
    try {
      const lidarrAlbum = lidarrAlbums.find(
        (a) => a.foreignAlbumId === albumId,
      );

      if (!lidarrAlbum) {
        throw new Error("Album not found in Lidarr");
      }

      await updateLidarrAlbum(lidarrAlbum.id, {
        ...lidarrAlbum,
        monitored: false,
      });

      setLidarrAlbums((prev) =>
        prev.map((a) =>
          a.id === lidarrAlbum.id ? { ...a, monitored: false } : a,
        ),
      );

      showSuccess(`Stopped monitoring album: ${title}`);
    } catch (err) {
      showError(`Failed to unmonitor album: ${err.message}`);
    } finally {
      setUnmonitoringAlbum(null);
    }
  };

  const handleBatchMonitor = async (monitored) => {
    const action = monitored ? "monitor" : "unmonitor";
    if (!window.confirm(`Are you sure you want to ${action} ALL albums for this artist?`)) return;

    setBatchMonitoring(true);
    try {
      const albumIds = lidarrAlbums.map(a => a.id);
      if (albumIds.length === 0) return;

      await monitorLidarrAlbums(albumIds, monitored);

      setLidarrAlbums(prev => prev.map(a => ({ ...a, monitored })));

      showSuccess(`Successfully ${monitored ? "monitored" : "unmonitored"} all albums`);
    } catch (err) {
      showError(`Failed to batch update albums: ${err.message}`);
    } finally {
      setBatchMonitoring(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const lookup = await lookupArtistInLidarr(mbid);
      setExistsInLidarr(lookup.exists);
      if (lookup.exists && lookup.artist) {
        setLidarrArtist(lookup.artist);
        await fetchLidarrData(lookup.artist.id);
      }
      showSuccess("Refreshed data from Lidarr");
    } catch (err) {
      showError("Failed to refresh data from Lidarr");
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceSync = async () => {
    if (!lidarrArtist?.id) return;
    setSyncing(true);
    try {
      // Trigger refresh command
      await runLidarrCommand("RefreshArtist", { artistId: lidarrArtist.id });
      showSuccess("Triggered Lidarr artist refresh. Syncing albums...");

      // Wait a few seconds for Lidarr to start/process, then fetch albums
      setTimeout(async () => {
        await fetchLidarrData(lidarrArtist.id);
        setSyncing(false);
      }, 5000);
    } catch (err) {
      showError("Failed to trigger Lidarr refresh");
      setSyncing(false);
    }
  };

  const handleSaveSuccess = (updatedArtist) => {
    setLidarrArtist(updatedArtist);
    showSuccess("Artist settings updated successfully");
  };

  const handleRequestAlbum = async (albumIdOrMbid) => {
    setRequestingAlbum(albumIdOrMbid);
    try {
      // Find the lidarr album from our state using either internal ID or MBID
      const lidarrAlbum = lidarrAlbums.find(
        (a) => a.id === albumIdOrMbid || a.foreignAlbumId === albumIdOrMbid
      );

      if (!lidarrAlbum) {
        throw new Error("Album not found in Lidarr. Try refreshing.");
      }

      // Lidarr requires the full object for PUT updates
      await updateLidarrAlbum(lidarrAlbum.id, {
        ...lidarrAlbum,
        monitored: true
      });

      setLidarrAlbums(prev => prev.map(a => a.id === lidarrAlbum.id ? { ...a, monitored: true } : a));
      if (selectedAlbumForDetails?.lidarrId === lidarrAlbum.id) {
        setSelectedAlbumForDetails(prev => ({ ...prev, monitored: true }));
      }
      await runLidarrCommand("AlbumSearch", { albumIds: [lidarrAlbum.id] });
      showSuccess(`Album "${lidarrAlbum.title}" request started (monitoring + search)`);
    } catch (err) {
      console.error("Failed to request album:", err);
      showError(`Failed to request album: ${err.message}`);
    } finally {
      setRequestingAlbum(null);
    }
  };

  const handleToggleLike = async () => {
    if (!artist) return;
    setLiking(true);
    try {
      const result = await toggleLikeArtist(mbid, artist.name, getCoverImage());
      setIsLiked(result.liked);
      showSuccess(result.liked ? `Added ${artist.name} to your liked artists` : `Removed ${artist.name} from your liked artists`);
    } catch (err) {
      showError("Failed to update like status");
    } finally {
      setLiking(false);
    }
  };

  const handlePlayOnNavidrome = async (e, release) => {
    e.stopPropagation();
    if (!navidromeConnected || !artist) return;

    setPlayingOnNavidrome(release.id);
    try {
      // Search for the album/track on Navidrome
      const result = await getNavidromePlaybackUrl(artist.name, release.title);

      // Extract track ID from the playback URL (format: #!/song/{id})
      const trackIdMatch = result.playbackUrl.match(/#!\/song\/(.+)$/);
      if (!trackIdMatch) {
        throw new Error("Could not extract track ID");
      }

      const trackId = trackIdMatch[1];

      // Play using the in-app player
      play({
        id: trackId,
        title: result.match?.title || release.title,
        artist: result.match?.artist || artist.name,
        album: result.match?.album || release.title,
        coverArt: `/api/navidrome/cover/${trackId}`
      });
    } catch (err) {
      showError(err.response?.data?.error || "Release not found on your Navidrome server.");
    } finally {
      setPlayingOnNavidrome(null);
    }
  };

  const getAlbumStatus = (releaseGroupId) => {
    if (!existsInLidarr || !lidarrAlbums || lidarrAlbums.length === 0) return null;

    // Try multiple ways to match: exact MBID, or MBID within a string
    const album = lidarrAlbums.find((a) => {
      if (!a.foreignAlbumId) return false;
      const foreignId = String(a.foreignAlbumId).toLowerCase();
      const targetId = String(releaseGroupId).toLowerCase();
      return foreignId === targetId || foreignId.includes(targetId) || targetId.includes(foreignId);
    });

    if (!album) {
      return null;
    }

    const stats = album.statistics || {};
    const trackCount = stats.trackCount || 0;
    const trackFileCount = stats.trackFileCount || 0;
    const percentOfTracks = stats.percentOfTracks || 0;

    if (album.monitored) {
      if (percentOfTracks === 100) {
        return {
          status: "available",
          label: "Available",
          trackCount,
          trackFileCount,
          percentOfTracks
        };
      }
      return {
        status: "monitored",
        label: "Monitored",
        trackCount,
        trackFileCount,
        percentOfTracks
      };
    }

    return {
      status: "unmonitored",
      label: "Not Monitored",
      trackCount,
      trackFileCount,
      percentOfTracks
    };
  };

  const handleModalClose = () => {
    setShowAddModal(false);
  };

  const formatLifeSpan = (lifeSpan) => {
    if (!lifeSpan) return null;
    const { begin, end, ended } = lifeSpan;
    if (!begin) return null;

    const beginYear = begin.split("-")[0];
    if (ended && end) {
      const endYear = end.split("-")[0];
      return `${beginYear} - ${endYear}`;
    }
    return `${beginYear} - Present`;
  };

  const getArtistType = (type) => {
    const types = {
      Person: "Solo Artist",
      Group: "Band",
      Orchestra: "Orchestra",
      Choir: "Choir",
      Character: "Character",
      Other: "Other",
    };
    return types[type] || type;
  };

  const getCoverImage = () => {
    if (coverImages.length > 0) {
      const frontCover = coverImages.find((img) => img.front);
      return frontCover?.image || coverImages[0]?.image;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Error Loading Artist
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/search")}
            className="btn btn-primary"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  const coverImage = getCoverImage();
  const lifeSpan = formatLifeSpan(artist["life-span"]);

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary mb-6 inline-flex items-center"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <div className="card mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 h-64 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
            {coverImage ? (
              <img
                src={coverImage}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-24 h-24 text-gray-400 dark:text-gray-600" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {artist.name}
            </h1>

            {artist.added && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                Added {new Date(artist.added).toLocaleDateString()}
              </div>
            )}

            {(artist.requestedBy || pendingRequest?.requestedBy) && (
              <div className="flex items-center text-primary-600 dark:text-primary-400 font-medium mb-4 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                Requested by {artist.requestedBy || pendingRequest?.requestedBy}
                {pendingRequest && pendingRequest.status === 'pending_approval' && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Pending Approval
                  </span>
                )}
              </div>
            )}

            {artist["sort-name"] && artist["sort-name"] !== artist.name && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                {artist["sort-name"]}
              </p>
            )}

            {artist.disambiguation && (
              <p className="text-gray-600 dark:text-gray-400 italic mb-4">
                {artist.disambiguation}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {artist.type && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Music className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium mr-2">Type:</span>
                  <span>{getArtistType(artist.type)}</span>
                </div>
              )}

              {lifeSpan && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <Calendar className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium mr-2">Active:</span>
                  <span>{lifeSpan}</span>
                </div>
              )}

              {artist.country && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium mr-2">Country:</span>
                  <span>{artist.country}</span>
                </div>
              )}

              {artist.area && artist.area.name && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <MapPin className="w-5 h-5 mr-2 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium mr-2">Area:</span>
                  <span>{artist.area.name}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {existsInLidarr ? (
                <button className="btn btn-success inline-flex items-center cursor-default">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  In Your Library
                </button>
              ) : pendingRequest ? (
                <button className={`btn inline-flex items-center cursor-default ${pendingRequest.status === 'pending_approval'
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30"
                  : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
                  }`}>
                  {pendingRequest.status === 'pending_approval' ? (
                    <Clock className="w-5 h-5 mr-2" />
                  ) : (
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                  )}
                  {pendingRequest.status === 'pending_approval'
                    ? "Pending Approval"
                    : "Processing..."}
                </button>
              ) : (
                <button
                  onClick={handleAddArtistClick}
                  className="btn btn-primary inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add to Lidarr
                </button>
              )}

              <button
                onClick={handleToggleLike}
                disabled={liking}
                className={`btn inline-flex items-center ${isLiked ? 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/30' : 'btn-secondary'}`}
                title={isLiked ? "Unlike Artist" : "Like Artist"}
              >
                <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
              </button>

              <a
                href={`https://musicbrainz.org/artist/${mbid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary inline-flex items-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                View on MusicBrainz
              </a>

              {existsInLidarr && user?.lidarrUrl && (
                <>
                  <a
                    href={`${user.lidarrUrl}/artist/${mbid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary inline-flex items-center"
                  >
                    <LayoutIcon className="w-5 h-5 mr-2" />
                    View in Lidarr
                  </a>
                  <button
                    onClick={handleForceSync}
                    disabled={syncing || refreshing}
                    className="btn btn-secondary inline-flex items-center"
                    title="Sync and Refresh from Lidarr"
                  >
                    <RefreshCcw className={`w-5 h-5 mr-2 ${syncing || refreshing ? "animate-spin" : ""}`} />
                    Sync with Lidarr
                  </button>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="btn btn-secondary p-2.5"
                    title="Artist Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {((artist.tags && artist.tags.length > 0) ||
        (artist.genres && artist.genres.length > 0)) && (
          <div className="card mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Tag className="w-6 h-6 mr-2" />
              Tags & Genres
            </h2>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const genres = (artist.genres || []).map(g => ({ ...g, type: 'genre' }));
                const tags = (artist.tags || []).map(t => ({ ...t, type: 'tag' }));

                // Merge and deduplicate by name (case-insensitive)
                const seen = new Set();
                const combined = [...genres, ...tags].filter(item => {
                  const name = item.name.toLowerCase();
                  if (seen.has(name)) return false;
                  seen.add(name);
                  return true;
                });

                return combined.map((item, idx) => (
                  <span
                    key={`${item.type}-${idx}`}
                    className={`badge text-sm px-3 py-1 ${item.type === 'genre'
                      ? "badge-primary"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {item.name}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}

      {/* Release Logic and Tabs */}
      {(() => {
        if (!artist["release-groups"] || artist["release-groups"].length === 0) return null;

        const allReleases = artist["release-groups"] || [];

        // Helper to get primary type (simplified)
        const getDisplayType = (rg) => {
          const type = rg["primary-type"];
          if (!type) return "Other";
          if (type === "Album") return "Album";
          if (type === "Single" || type === "EP") return "Single / EP";
          if (type === "Broadcast") return "Broadcast";
          return "Other";
        };

        const filtered = allReleases
          .filter(rg => {
            const matchesSearch = rg.title.toLowerCase().includes(releaseSearch.toLowerCase());
            const displayType = getDisplayType(rg);
            const matchesTab = activeReleaseTab === "all" ||
              (activeReleaseTab === "albums" && displayType === "Album") ||
              (activeReleaseTab === "singles" && displayType === "Single / EP") ||
              (activeReleaseTab === "broadcast" && displayType === "Broadcast") ||
              (activeReleaseTab === "other" && displayType === "Other");
            return matchesSearch && matchesTab;
          })
          .sort((a, b) => {
            if (releaseSort === "year-desc") {
              const dateA = a["first-release-date"] || "0000";
              const dateB = b["first-release-date"] || "0000";
              return dateB.localeCompare(dateA);
            }
            if (releaseSort === "year-asc") {
              const dateA = a["first-release-date"] || "9999";
              const dateB = b["first-release-date"] || "9999";
              return dateA.localeCompare(dateB);
            }
            if (releaseSort === "title") {
              return a.title.localeCompare(b.title);
            }
            return 0;
          });

        return (
          <div className="card mb-8">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <LayoutIcon className="w-6 h-6 mr-3 text-primary-500" />
                  Albums & Releases ({filtered.length})
                </h2>
                {existsInLidarr && lidarrAlbums.length > 0 && (
                  <div className="flex gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBatchMonitor(true)}
                        disabled={batchMonitoring}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-900/10 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        {batchMonitoring ? <Loader className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2 text-green-500" />}
                        Monitor All
                      </button>
                      <button
                        onClick={() => handleBatchMonitor(false)}
                        disabled={batchMonitoring}
                        className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        {batchMonitoring ? <Loader className="w-3 h-3 animate-spin mr-2" /> : <XCircle className="w-3 h-3 mr-2 text-red-500" />}
                        Unmonitor All
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search and Sort Toolbar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary-500 transition-colors w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search artist releases..."
                    value={releaseSearch}
                    onChange={(e) => setReleaseSearch(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-sm font-medium dark:text-gray-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Sort By</span>
                  <select
                    value={releaseSort}
                    onChange={(e) => setReleaseSort(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl py-3 px-4 text-xs font-bold uppercase tracking-wider outline-none focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer dark:text-gray-200"
                  >
                    <option value="year-desc">Year (Newest)</option>
                    <option value="year-asc">Year (Oldest)</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Tab Filters */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                {[
                  { id: "all", label: "All" },
                  { id: "albums", label: "Albums" },
                  { id: "singles", label: "Singles & EPs" },
                  { id: "broadcast", label: "Broadcasts" },
                  { id: "other", label: "Other" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReleaseTab(tab.id)}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all ${activeReleaseTab === tab.id
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                      : "bg-gray-50 dark:bg-gray-800/50 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-3 custom-scrollbar">
              {filtered.length > 0 ? (
                filtered.map((releaseGroup) => {
                  const status = getAlbumStatus(releaseGroup.id);
                  const lidarrAlbum = existsInLidarr ? lidarrAlbums.find(a => {
                    const fid = String(a.foreignAlbumId).toLowerCase();
                    const rid = String(releaseGroup.id).toLowerCase();
                    return fid === rid || fid.includes(rid) || rid.includes(fid);
                  }) : null;

                  return (
                    <div
                      key={releaseGroup.id}
                      onClick={() => {
                        if (lidarrAlbum) {
                          setSelectedAlbumForDetails({
                            ...releaseGroup,
                            lidarrId: lidarrAlbum.id,
                            artistId: lidarrArtist?.id,
                            monitored: lidarrAlbum.monitored,
                            year: releaseGroup["first-release-date"]?.split("-")[0]
                          });
                        }
                      }}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-2xl hover:shadow-primary-500/5 dark:hover:shadow-none transition-all group ${lidarrAlbum ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex-1 flex gap-5">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                          <Music className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg group-hover:text-primary-500 transition-colors truncate">
                            {releaseGroup.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {releaseGroup["first-release-date"] && (
                              <span className="text-[10px] font-black text-primary-500 px-2 py-1 bg-primary-500/5 border border-primary-500/10 rounded-lg">
                                {releaseGroup["first-release-date"].split("-")[0]}
                              </span>
                            )}
                            {releaseGroup["primary-type"] && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg">
                                {releaseGroup["primary-type"]}
                              </span>
                            )}
                            {releaseGroup["secondary-types"] &&
                              releaseGroup["secondary-types"].length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {releaseGroup["secondary-types"].map(type => (
                                    <span key={type} className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 px-2 py-1 rounded-lg">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-5 md:mt-0">
                        {status ? (
                          status.status === "available" ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10 cursor-default">
                                <CheckCircle className="w-4 h-4" />
                                Available
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnmonitorAlbum(releaseGroup.id, releaseGroup.title);
                                }}
                                disabled={unmonitoringAlbum === releaseGroup.id}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                                title="Stop Monitoring"
                              >
                                {unmonitoringAlbum === releaseGroup.id ? (
                                  <Loader className="w-4 h-4 animate-spin text-red-500" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          ) : status.status === "monitored" ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/10 cursor-default">
                                <Clock className="w-4 h-4" />
                                {status.trackCount > 0 ? `${status.trackFileCount}/${status.trackCount} tracks` : "Monitored"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnmonitorAlbum(releaseGroup.id, releaseGroup.title);
                                }}
                                disabled={unmonitoringAlbum === releaseGroup.id}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/10"
                                title="Stop Monitoring"
                              >
                                {unmonitoringAlbum === releaseGroup.id ? (
                                  <Loader className="w-4 h-4 animate-spin text-red-500" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestAlbum(releaseGroup.id);
                              }}
                              disabled={requestingAlbum === releaseGroup.id}
                              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary-500/20 active:scale-95 flex items-center gap-2"
                            >
                              {requestingAlbum === releaseGroup.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                "Request"
                              )}
                            </button>
                          )
                        ) : existsInLidarr ? (
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] pr-2 italic opacity-60">
                            Not in Lidarr
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] pr-2 italic opacity-60">
                            Add Artist First
                          </span>
                        )}

                        <div className="flex items-center gap-2.5">
                          {navidromeConnected && status?.status === "available" && (
                            <button
                              onClick={(e) => handlePlayOnNavidrome(e, releaseGroup)}
                              disabled={playingOnNavidrome === releaseGroup.id}
                              className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 transition-all shadow-sm group/navi"
                              title="Play on Navidrome"
                            >
                              {playingOnNavidrome === releaseGroup.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4 group-hover/navi:scale-110 transition-transform fill-current text-primary-500" />
                              )}
                            </button>
                          )}
                          <a
                            href={`https://musicbrainz.org/release-group/${releaseGroup.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 transition-all shadow-sm group/btn"
                            title="View on MusicBrainz"
                          >
                            <Music className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </a>
                          {health?.lidarrUrl && existsInLidarr && (
                            <a
                              href={`${health.lidarrUrl}/album/${lidarrAlbum?.id || ""}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 transition-all shadow-sm group/btn"
                              title="View in Lidarr"
                            >
                              <LayoutIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Music className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Results Found</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto">We couldn't find any releases matching your current filters or search query.</p>
                  <button
                    onClick={() => { setReleaseSearch(""); setActiveReleaseTab("all"); }}
                    className="mt-8 px-6 py-3 border-2 border-primary-500/20 text-primary-500 hover:bg-primary-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {artist.aliases && artist.aliases.length > 0 && (
        <div className="card mt-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Also Known As
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {artist.aliases.slice(0, 12).map((alias, idx) => (
              <div
                key={idx}
                className="text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                {alias.name}
                {alias.locale && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    ({alias.locale})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {similarArtists.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-primary-500" />
            Similar Artists
          </h2>
          <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
            {similarArtists.map((similar) => (
              <div
                key={similar.id}
                className="flex-shrink-0 w-40 group cursor-pointer"
                onClick={() => navigate(`/artist/${similar.id}`)}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mb-2 shadow-sm group-hover:shadow-md transition-all">
                  <ArtistImage
                    src={similar.image}
                    mbid={similar.id}
                    alt={similar.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!existingSimilar[similar.id] && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArtistToAdd(similar);
                        }}
                        className="p-1.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {existingSimilar[similar.id] && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-md">
                      <CheckCircle className="w-2.5 h-2.5" />
                    </div>
                  )}

                  {similar.match && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      {similar.match}% Match
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-500 transition-colors">
                  {similar.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && artist && (
        <AddArtistModal
          artist={artist}
          onClose={handleModalClose}
          onSuccess={handleAddSuccess}
        />
      )}

      {artistToAdd && (
        <AddArtistModal
          artist={{
            id: artistToAdd.id,
            name: artistToAdd.name,
          }}
          onClose={() => setArtistToAdd(null)}
          onSuccess={handleAddSuccess}
          initialMonitored={true}
        />
      )}

      {showSettingsModal && (
        <ArtistSettingsModal
          artist={lidarrArtist}
          qualityProfiles={qualityProfiles}
          metadataProfiles={metadataProfiles}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={handleSaveSuccess}
          showError={showError}
        />
      )}

      {selectedAlbumForDetails && (
        <AlbumTracksModal
          album={selectedAlbumForDetails}
          artistName={artist.name}
          onClose={() => setSelectedAlbumForDetails(null)}
          onRequest={handleRequestAlbum}
        />
      )}
    </div>
  );
}

export default ArtistDetailsPage;

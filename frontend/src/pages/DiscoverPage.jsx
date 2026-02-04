import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader,
  Music,
  Sparkles,
  TrendingUp,
  Plus,
  ExternalLink,
  CheckCircle,
  Tag,
  PlayCircle,
  Clock,
  History,
  Heart,
  RefreshCw,
} from "lucide-react";
import {
  getDashboard,
  toggleLikeArtist,
  api,
  getNavidromeRecommendations,
  getNavidromeStatus,
} from "../utils/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import AddArtistModal from "../components/AddArtistModal";
import ArtistImage from "../components/ArtistImage";

function DiscoverPage() {
  const [data, setData] = useState(null);
  const [personalData, setPersonalData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingArtists, setExistingArtists] = useState({});
  const [likedArtists, setLikedArtists] = useState([]);
  const [likingArtist, setLikingArtist] = useState(null);
  const [artistToAdd, setArtistToAdd] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Navidrome State
  const [navidromeConnected, setNavidromeConnected] = useState(false);
  const [navidromeRecommendations, setNavidromeRecommendations] = useState([]);
  const [loadingNavidrome, setLoadingNavidrome] = useState(false);

  const userRequests = useMemo(() => {
    return requests.filter(r => r.requestedByUserId === user?.id);
  }, [requests, user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashboard, naviStatus] = await Promise.all([
          getDashboard(),
          getNavidromeStatus().catch(() => ({ connected: false }))
        ]);

        setData(dashboard.discovery);
        setPersonalData(dashboard.personal);
        setRequests(dashboard.requests);
        setRecentlyAdded(dashboard.recentlyAdded);
        setLikedArtists(dashboard.likedArtists);
        setExistingArtists(dashboard.existingArtists);

        setNavidromeConnected(naviStatus.connected);

        if (naviStatus.connected && user?.navidromeUsername) {
          setLoadingNavidrome(true);
          try {
            const recs = await getNavidromeRecommendations();
            setNavidromeRecommendations(recs);
          } catch (error) {
            console.error("Failed to load Navidrome recommendations", error);
          } finally {
            setLoadingNavidrome(false);
          }
        }

        setLoading(false);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load discovery data",
        );
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAddArtistClick = (artist) => {
    setArtistToAdd(artist);
  };

  const handleAddSuccess = (artist) => {
    setExistingArtists((prev) => ({
      ...prev,
      [artist.id]: true,
    }));
    setArtistToAdd(null);
    // Refresh requests/liked - simplified re-fetch
    window.location.reload();
    showSuccess(`Successfully added ${artist.name} to Lidarr!`);
  };

  const handleRefreshDiscovery = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await api.post("/discover/refresh");
      showSuccess("Discovery refresh started in the background.");
    } catch (err) {
      showError("Failed to start refresh: " + (err.response?.data?.message || err.message));
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleLike = async (e, artist) => {
    e.stopPropagation();
    // ... keep existing logic if any, but it was missing in replaced block context so I assume it uses `toggleLikeArtist`
    // I'll re-implement standard toggle logic just in case since I'm replacing the whole function scope potentially
    if (likingArtist === artist.id) return;
    setLikingArtist(artist.id);
    try {
      const response = await toggleLikeArtist(artist.id, artist.name, artist.image);
      if (response.liked) {
        setLikedArtists(prev => [...prev, artist.id]);
        showSuccess(`Added ${artist.name} to favorites`);
      } else {
        setLikedArtists(prev => prev.filter(id => id !== artist.id));
        showSuccess(`Removed ${artist.name} from favorites`);
      }
    } catch (err) {
      showError("Failed to update favorite");
    } finally {
      setLikingArtist(null);
    }
  };

  const getLidarrArtistImage = (artist) => {
    if (artist.images && artist.images.length > 0) {
      const posterImage = artist.images.find(
        (img) => img.coverType === "poster" || img.coverType === "fanart",
      );
      const image = posterImage || artist.images[0];

      if (image && artist.id) {
        const coverType = image.coverType || "poster";
        const filename = `${coverType}.jpg`;
        return `/api/lidarr/mediacover/${artist.id}/${filename}`;
      }
      return image?.remoteUrl || image?.url || null;
    }
    return null;
  };

  const genreSections = useMemo(() => {
    // Determine which genres to use (Personal > Global)
    const genresToUse = personalData?.topGenres?.length > 0
      ? personalData.topGenres
      : data?.topGenres;

    // Combine recommendation pools
    const allRecommendations = [
      ...(personalData?.recommendations || []),
      ...(data?.recommendations || []),
    ];

    if (!genresToUse || allRecommendations.length === 0) return [];

    const sections = [];
    const usedArtistIds = new Set();

    // Avoid repeating artists already displayed in the main sections
    (personalData?.recommendations || []).slice(0, 12).forEach(a => usedArtistIds.add(a.id));
    (data?.recommendations || []).slice(0, 12).forEach(a => usedArtistIds.add(a.id));

    const shuffledGenres = [...genresToUse].sort(() => 0.5 - Math.random());

    for (const genre of shuffledGenres) {
      if (sections.length >= 4) break;

      const genreArtists = allRecommendations.filter((artist) => {
        if (usedArtistIds.has(artist.id)) return false;

        const artistTags = artist.tags || [];
        return artistTags.some((tag) =>
          tag.toLowerCase().includes(genre.toLowerCase()),
        );
      });

      if (genreArtists.length >= 4) {
        const selectedArtists = genreArtists.slice(0, 6);
        selectedArtists.forEach(artist => usedArtistIds.add(artist.id));

        sections.push({
          genre,
          artists: selectedArtists,
        });
      }
    }

    return sections;
  }, [data, personalData]);

  const ArtistCard = ({ artist, status }) => {
    const isLiked = likedArtists.includes(artist.id);

    return (
      <div className="group relative flex flex-col w-full min-w-0">
        <div
          onClick={() => navigate(`/artist/${artist.id}`)}
          className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm group-hover:shadow-md transition-all"
        >
          <ArtistImage
            src={artist.image}
            mbid={artist.id}
            alt={artist.name}
            className="h-full w-full group-hover:scale-105 transition-transform duration-300"
          />

          {status && (
            <div
              className={`absolute bottom-2 left-2 right-2 py-1 px-2 rounded text-[10px] font-bold uppercase text-center backdrop-blur-md shadow-lg ${status === "available"
                ? "bg-green-500/90 text-white"
                : status === "processing"
                  ? "bg-blue-500/90 text-white"
                  : "bg-yellow-500/90 text-white"
                }`}
            >
              {artist.statistics ? (
                <span className="flex flex-col leading-tight">
                  <span>{status === "available" ? "Available" : status}</span>
                  <span className="text-[8px] opacity-90 normal-case font-medium">
                    {artist.statistics.trackCount} / {artist.statistics.totalTrackCount} Tracks
                  </span>
                </span>
              ) : (
                status
              )}
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={(e) => handleToggleLike(e, artist)}
              disabled={likingArtist === artist.id}
              className={`p-2 rounded-full transition-all shadow-lg ${isLiked
                ? "bg-red-500 text-white hover:bg-red-600 scale-110"
                : "bg-white/20 backdrop-blur-sm text-white hover:bg-red-500 hover:scale-110"
                }`}
              title={isLiked ? "Unlike Artist" : "Like Artist"}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            </button>

            {!existingArtists[artist.id] && !status && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddArtistClick(artist);
                }}
                className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 hover:scale-110 transition-all shadow-lg"
                title="Add to Lidarr"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/artist/${artist.id}`);
              }}
              className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 hover:scale-110 transition-all"
              title="View Details"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>

          {existingArtists[artist.id] && !status && (
            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-md">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h3
            onClick={() => navigate(`/artist/${artist.id}`)}
            className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 cursor-pointer"
          >
            {artist.name}
          </h3>
          <div className="flex flex-col min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {artist.type === "Person" ? "Artist" : artist.type}
              {artist.sourceArtist && ` • Similar to ${artist.sourceArtist}`}
            </p>
            {artist.subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {artist.subtitle}
              </p>
            )}
            {artist.requestedBy && (
              <div className="flex items-center text-primary-500 mt-0.5 font-medium text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Requested by {artist.requestedBy}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
          Curating your recommendations...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Analyzing your library to find hidden gems
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Unable to load discovery
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    recommendations = [],
    globalTop = [],
    globalTopTracks = [],
    topGenres = [],
    topTags = [],
    basedOn = [],
    lastUpdated,
    isUpdating,
  } = data || {};

  return (
    <div className="space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white shadow-sm dark:shadow-xl border border-primary-100/50 dark:border-transparent">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-primary-500/10 dark:bg-primary-500/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-3xl"></div>

        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300 mb-2 font-medium">
                <Sparkles className="w-5 h-5" />
                <span>Your Daily Mix</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                Music Discovery
              </h1>
              <p className="text-gray-600 dark:text-gray-300 max-w-xl text-lg">
                Curated recommendations updated daily based on your likes and requests.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {lastUpdated && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-gray-200 dark:border-transparent shadow-sm">
                  <Clock className="w-3 h-3 mr-1.5" />
                  Updated {new Date(lastUpdated).toLocaleDateString()}
                  {isUpdating && <Loader className="w-3 h-3 ml-2 animate-spin" />}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Suggested For You
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {(personalData?.dailySuggestions || []).slice(0, 10).map((artist) => {
                  const isLiked = likedArtists.includes(artist.id);
                  return (
                    <div
                      key={artist.id}
                      className="group flex-shrink-0 flex flex-col items-center cursor-pointer"
                      onClick={() => navigate(`/artist/${artist.id}`)}
                    >
                      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ring-2 ring-transparent group-hover:ring-primary-500 transition-all shadow-lg group-hover:shadow-xl group-hover:scale-105">
                        <ArtistImage
                          src={artist.image}
                          mbid={artist.id}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Quick Add Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {!existingArtists[artist.id] ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddArtistClick(artist);
                              }}
                              className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-lg"
                              title="Add to Library"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          ) : (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          )}
                        </div>
                        {/* Like Indicator */}
                        {isLiked && (
                          <div className="absolute bottom-0 right-0 p-1 bg-red-500 rounded-full shadow-md">
                            <Heart className="w-3 h-3 text-white fill-current" />
                          </div>
                        )}
                      </div>
                      <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 text-center truncate w-20 md:w-24 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {artist.name}
                      </span>
                    </div>
                  );
                })}
                {(!personalData?.dailySuggestions || personalData.dailySuggestions.length === 0) && (
                  <div className="flex items-center justify-center w-full py-4 text-gray-500 dark:text-gray-400">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Like some artists to get personalized suggestions!
                  </div>
                )}
              </div>
            </div>

            {(personalData?.basedOn?.length > 0) && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Inspired by {personalData.basedOn.slice(0, 3).map((a) => a.name).join(", ")}{" "}
                  {personalData.basedOn.length > 3 && `and ${personalData.basedOn.length - 3} others`}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex items-center justify-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-8 overflow-x-auto">
          {[
            { id: "personal", label: "For You", icon: Sparkles },
            ...(navidromeConnected && user?.navidromeUsername ? [{ id: "navidrome", label: "Listening History", icon: History }] : []),
            { id: "server", label: "Aurral Wide", icon: PlayCircle },
            ...(globalTop?.length > 0 || globalTopTracks?.length > 0 ? [{ id: "charts", label: "Top Hits", icon: TrendingUp }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "animate-pulse" : ""}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "personal" && (
          <div className="space-y-12">
            {userRequests.length > 0 && (
              <section className="animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <History className="w-6 h-6 mr-3 text-primary-500" />
                    Your Requests
                  </h2>
                  <button
                    onClick={() => navigate("/requests")}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {userRequests.slice(0, 6).map((request) => (
                    <ArtistCard
                      key={request.mbid}
                      status={request.status}
                      artist={{
                        id: request.mbid,
                        name: request.name,
                        image: request.image,
                        subtitle: `Requested ${new Date(
                          request.requestedAt,
                        ).toLocaleDateString()}`,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Sparkles className="w-6 h-6 mr-3 text-primary-500" />
                  Recommended for You
                </h2>
              </div>

              {personalData?.recommendations?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {personalData.recommendations.slice(0, 12).map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              ) : personalData?.message ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                  <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{personalData.message}</p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                  <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Not enough data to generate personal recommendations yet.
                  </p>
                </div>
              )}
            </section>

            {genreSections
              .filter((s) => personalData?.topGenres?.includes(s.genre))
              .map((section) => (
                <section key={section.genre}>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="text-primary-500 mr-2">Because you like</span>
                      {section.genre}
                    </h2>
                    <button
                      onClick={() =>
                        navigate(`/search?q=${encodeURIComponent(section.genre)}&type=tag`)
                      }
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      See All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {section.artists.slice(0, 6).map((artist) => (
                      <ArtistCard key={`${section.genre}-${artist.id}`} artist={artist} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        {navidromeConnected && activeTab === "navidrome" && (
          <div className="space-y-12 animate-slide-up">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <History className="w-6 h-6 mr-3 text-accent" />
                    Based on your Listening
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Recommendations generated from your recent plays and frequent jams on Navidrome.
                  </p>
                </div>
                {!user?.navidromeUsername && (
                  <div className="badge badge-warning">
                    Link your Navidrome account in your Profile to see data here.
                  </div>
                )}
              </div>

              {loadingNavidrome ? (
                <div className="flex justify-center py-20">
                  <Loader className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : navidromeRecommendations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {navidromeRecommendations.map((artist, i) => (
                    <ArtistCard
                      key={i}
                      artist={{
                        id: artist.mbid,
                        name: artist.name,
                        image: artist.image,
                        type: "Artist",
                        sourceArtist: artist.sourceArtist,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-base-200/50 rounded-2xl">
                  <Music className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
                  <h3 className="font-bold text-lg">No playback history found</h3>
                  <p className="text-base-content/60 max-w-md mx-auto mt-2">
                    We couldn't find enough listening history yet.
                    {user?.permissions?.includes('admin')
                      ? " Try playing some music on Navidrome or running the refresh job in Settings > Jobs."
                      : " Try playing some music on Navidrome."}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "server" && (
          <div className="space-y-12">
            {recentlyAdded.length > 0 && (
              <section className="animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <CheckCircle className="w-6 h-6 mr-3 text-primary-500" />
                    Recently Added
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {recentlyAdded.slice(0, 6).map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      status="available"
                      artist={{
                        id: artist.foreignArtistId,
                        name: artist.artistName,
                        image: getLidarrArtistImage(artist),
                        type: "Artist",
                        subtitle: `Added ${new Date(artist.added).toLocaleDateString()}`,
                        requestedBy: artist.requestedBy,
                        requestedByUserId: artist.requestedByUserId,
                        statistics: artist.statistics,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <PlayCircle className="w-6 h-6 mr-3 text-primary-500" />
                  Aurral Library Suggestions
                </h2>
                <button
                  onClick={handleRefreshDiscovery}
                  disabled={refreshing || isUpdating}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-gray-600 dark:text-gray-400 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing || isUpdating ? "animate-spin text-primary-500" : ""}`} />
                  {refreshing || isUpdating ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {recommendations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {recommendations.slice(0, 12).map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                  <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Not enough data to generate recommendations yet.</p>
                </div>
              )}
            </section>

            {genreSections
              .filter((s) => !personalData?.topGenres?.includes(s.genre))
              .map((section) => (
                <section key={section.genre}>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="text-primary-500 mr-2">Because you like</span>
                      {section.genre}
                    </h2>
                    <button
                      onClick={() =>
                        navigate(`/search?q=${encodeURIComponent(section.genre)}&type=tag`)
                      }
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      See All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {section.artists.slice(0, 6).map((artist) => (
                      <ArtistCard key={`${section.genre}-${artist.id}`} artist={artist} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        {activeTab === "charts" && (
          <div className="space-y-12">
            {globalTopTracks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <Music className="w-6 h-6 mr-3 text-primary-500" />
                    Global Top Tracks
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {globalTopTracks.slice(0, 24).map((track, i) => (
                    <div key={i} className="group relative flex flex-col w-full min-w-0">
                      <div
                        onClick={() => navigate(`/search?q=${encodeURIComponent(track.artist)}&type=artist`)}
                        className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm group-hover:shadow-md transition-all"
                      >
                        <ArtistImage
                          src={track.image}
                          mbid={track.artistMbid}
                          alt={track.name}
                          className="h-full w-full group-hover:scale-105 transition-transform duration-300 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {track.name}
                        </h3>
                        <p
                          onClick={() => navigate(`/search?q=${encodeURIComponent(track.artist)}&type=artist`)}
                          className="text-sm text-gray-500 dark:text-gray-400 truncate hover:text-primary-500 cursor-pointer"
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {globalTop.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-3 text-primary-500" />
                    Global Trending Artists
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {globalTop.slice(0, 24).map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {globalTopTracks.length === 0 && globalTop.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Global Charts Unavailable
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  To see global trending artists and tracks, please ensure your Last.fm API key is configured in the settings.
                </p>
                <button
                  onClick={() => navigate("/settings")}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                >
                  Go to Settings
                </button>
              </div>
            )}

            {topTags.length > 0 && (
              <section className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center mb-6">
                  <Tag className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Explore by Tag
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}&type=tag`)}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {artistToAdd && (
        <AddArtistModal
          artist={artistToAdd}
          onClose={() => setArtistToAdd(null)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}

export default DiscoverPage;

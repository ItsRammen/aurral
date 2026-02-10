import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader,
  Music,
  Disc,
  ExternalLink,
  CheckCircle,
  Plus,
  Play,
  RefreshCw
} from "lucide-react";
import {
  searchArtists,
  lookupArtistsInLidarrBatch,
  searchArtistsByTag,
  searchRecordings,
  searchAlbums,
  getNavidromeStatus,
  getNavidromePlaybackUrl,
} from "../utils/api";
import AddArtistModal from "../components/AddArtistModal";
import LoadingSpinner from "../components/LoadingSpinner";
import ArtistImage from "../components/ArtistImage";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type");
  const [results, setResults] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [navidromeConnected, setNavidromeConnected] = useState(false);
  const [playingOnNavidrome, setPlayingOnNavidrome] = useState(null); // Track ID if searching
  const [error, setError] = useState(null);
  const [existingArtists, setExistingArtists] = useState({});
  const [artistToAdd, setArtistToAdd] = useState(null);
  const [artistImages, setArtistImages] = useState({});
  const [songArtistData, setSongArtistData] = useState({}); // To store artist info for songs
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const status = await getNavidromeStatus();
        setNavidromeConnected(status.connected);
      } catch (e) {
        console.error("Failed to fetch Navidrome status:", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setRecordings([]);
        setAlbums([]);
        return;
      }

      setLoading(true);
      setRecordingsLoading(true);
      setAlbumsLoading(true);
      setError(null);

      // Perform artist search
      try {
        let artists = [];

        if (type === "tag") {
          const data = await searchArtistsByTag(query.trim());
          artists = data.recommendations || [];
        } else {
          const data = await searchArtists(query.trim());
          artists = data.artists || [];
        }

        setResults(artists);

        if (artists.length > 0) {
          const imagesMap = {};

          artists.forEach((artist) => {
            if (artist.image) {
              imagesMap[artist.id] = artist.image;
            }
          });
          setArtistImages(imagesMap);

          try {
            const mbids = artists.map((a) => a.id).filter(Boolean);
            if (mbids.length > 0) {
              const existingMap = await lookupArtistsInLidarrBatch(mbids);
              setExistingArtists(existingMap);
            }
          } catch (err) {
            console.error("Failed to batch lookup artists:", err);
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Failed to search artists. Please try again.",
        );
        setResults([]);
      } finally {
        setLoading(false);
      }

      // Perform recording search
      try {
        if (type !== "tag") {
          const data = await searchRecordings(query.trim());
          const records = data.recordings || [];
          setRecordings(records);

          // Optionally fetch artist info for the first few songs if they have MBIDs
          // This helps show the artist card as in the mockup
        }
      } catch (err) {
        console.error("Recording search failed:", err);
      } finally {
        setRecordingsLoading(false);
      }

      // Perform album search
      try {
        if (type !== "tag") {
          const data = await searchAlbums(query.trim());
          const albumResults = data.albums || [];
          setAlbums(albumResults);
        }
      } catch (err) {
        console.error("Album search failed:", err);
      } finally {
        setAlbumsLoading(false);
      }
    };

    performSearch();
  }, [query, type]);

  const handleAddArtistClick = (artist) => {
    setArtistToAdd(artist);
  };

  const handleAddSuccess = (artist) => {
    setExistingArtists((prev) => ({
      ...prev,

      [artist.id]: true,
    }));

    setArtistToAdd(null);


    showSuccess(`Successfully added ${artist.name} to Lidarr!`);
  };

  const handlePlayOnNavidrome = async (e, track) => {
    e.stopPropagation();
    if (!navidromeConnected) return;

    setPlayingOnNavidrome(track.mbid || track.name);
    try {
      const result = await getNavidromePlaybackUrl(track.artist, track.name);
      window.open(result.playbackUrl, "_blank");
    } catch (err) {
      showError(err.response?.data?.error || "Track not found on your Navidrome server.");
    } finally {
      setPlayingOnNavidrome(null);
    }
  };

  const handleModalClose = () => {
    setArtistToAdd(null);
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

  return (
    <div className="page-container">
      <PageHeader
        title={type === "tag" ? "Genre Results" : "Search Results"}
        subtitle={
          query
            ? type === "tag"
              ? `Top artists for tag "${query}"`
              : `Showing results for "${query}"`
            : undefined
        }
        showBack
      />

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="xl" />
        </div>
      )}

      {!loading && query && (
        <div className="animate-slide-up">
          {results.length === 0 && recordings.length === 0 && !recordingsLoading ? (
            <div className="card text-center py-12">
              <Music className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Results Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {type === "tag"
                  ? `We couldn't find any top artists for tag "${query}"`
                  : `We couldn't find any artists or songs matching "${query}"`}
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const isExactArtistMatch = results[0] && results[0].name.toLowerCase() === query.trim().toLowerCase();
                const isExactSongMatch = recordings[0] && recordings[0].name.toLowerCase() === query.trim().toLowerCase();
                const shouldPrioritizeSongs = isExactSongMatch && !isExactArtistMatch;

                const artistsSection = results.length > 0 && (
                  <div className="mb-10">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Found {results.length} result{results.length !== 1 ? "s" : ""}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {results.map((artist) => (
                        <div
                          key={artist.id}
                          className="group relative flex flex-col w-full min-w-0"
                        >
                          <div
                            onClick={() => navigate(`/artist/${artist.id}`)}
                            className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm group-hover:shadow-md transition-all"
                          >
                            <ArtistImage
                              src={artistImages[artist.id]}
                              mbid={artist.id}
                              alt={artist.name}
                              className="h-full w-full group-hover:scale-105 transition-transform duration-300"
                            />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {!existingArtists[artist.id] && (
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
                              <a
                                href={`https://musicbrainz.org/artist/${artist.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 hover:scale-110 transition-all"
                                title="View on MusicBrainz"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            </div>

                            {existingArtists[artist.id] && (
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

                            <div className="flex flex-col min-w-0 text-sm text-gray-500 dark:text-gray-400">
                              {artist.type && (
                                <p className="truncate">
                                  {getArtistType(artist.type)}
                                </p>
                              )}
                              {artist.country && (
                                <p className="truncate text-xs opacity-80">
                                  {artist.country}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );

                const songsSection = (recordings.length > 0 || recordingsLoading) && (
                  <div className="animate-slide-up">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <Music className="w-6 h-6 text-primary-500" />
                      Songs
                    </h2>

                    {recordingsLoading ? (
                      <div className="flex justify-start items-center py-10">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Top Song Prompt - Mockup Style */}
                        {recordings[0] && (
                          <div className="flex flex-col gap-4">
                            <p className="font-bold text-lg text-gray-700 dark:text-gray-300">
                              Are you looking for <span className="text-primary-500">"{recordings[0].name}"</span> by <span className="text-gray-900 dark:text-gray-100">{recordings[0].artist}</span>?
                            </p>


                            {(() => {
                              const matchingArtist = results.find(a =>
                                a.name.toLowerCase() === recordings[0].artist.toLowerCase()
                              );

                              if (matchingArtist) {
                                return (
                                  <div className="w-48">
                                    <div
                                      onClick={() => navigate(`/artist/${matchingArtist.id}`)}
                                      className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                                    >
                                      <ArtistImage
                                        src={artistImages[matchingArtist.id]}
                                        mbid={matchingArtist.id}
                                        alt={matchingArtist.name}
                                        className="h-full w-full group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <h3
                                      onClick={() => navigate(`/artist/${matchingArtist.id}`)}
                                      className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 cursor-pointer"
                                    >
                                      {matchingArtist.name}
                                    </h3>
                                  </div>
                                );
                              } else if (recordings[0].artistMbid) {
                                return (
                                  <div className="w-48">
                                    <div
                                      onClick={() => navigate(`/artist/${recordings[0].artistMbid}`)}
                                      className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                                    >
                                      <ArtistImage
                                        mbid={recordings[0].artistMbid}
                                        alt={recordings[0].artist}
                                        className="h-full w-full group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <h3
                                      onClick={() => navigate(`/artist/${recordings[0].artistMbid}`)}
                                      className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 cursor-pointer"
                                    >
                                      {recordings[0].artist}
                                    </h3>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* List of other matches */}
                        {recordings.length > 1 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                            {recordings.slice(1, 10).map((track, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-primary-500/50 transition-colors group cursor-pointer"
                                onClick={() => {
                                  if (track.artistMbid) navigate(`/artist/${track.artistMbid}`);
                                  else navigate(`/search?q=${encodeURIComponent(track.artist)}`);
                                }}
                              >
                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-primary-500/10 transition-colors">
                                  <Music className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-500 transition-colors">
                                    {track.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    by {track.artist}
                                  </p>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

                const albumsSection = (albums.length > 0 || albumsLoading) && (
                  <div className="animate-slide-up">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <Disc className="w-6 h-6 text-primary-500" />
                      Albums
                    </h2>

                    {albumsLoading ? (
                      <div className="flex justify-start items-center py-10">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {albums.slice(0, 12).map((album, idx) => (
                          <div
                            key={idx}
                            className="group relative flex flex-col w-full min-w-0"
                          >
                            <div
                              onClick={() => navigate(`/search?q=${encodeURIComponent(album.artist)}`)}
                              className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 cursor-pointer shadow-sm group-hover:shadow-md transition-all"
                            >
                              {album.image ? (
                                <img
                                  src={album.image}
                                  alt={album.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                                  <Disc className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <h3
                                onClick={() => navigate(`/search?q=${encodeURIComponent(album.artist)}`)}
                                className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 cursor-pointer"
                              >
                                {album.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {album.artist}
                              </p>
                              {album.year && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {album.year}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );

                const separator = <div className="h-px bg-gray-200 dark:bg-gray-800 my-10 w-full" />;

                if (shouldPrioritizeSongs) {
                  return (
                    <>
                      {songsSection}
                      {(albums.length > 0 || albumsLoading) && separator}
                      {albumsSection}
                      {results.length > 0 && separator}
                      {artistsSection}
                    </>
                  );
                }

                return (
                  <>
                    {artistsSection}
                    {(albums.length > 0 || albumsLoading) && results.length > 0 && separator}
                    {albumsSection}
                    {(recordings.length > 0 || recordingsLoading) && (albums.length > 0 || results.length > 0) && separator}
                    {songsSection}
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}

      {artistToAdd && (
        <AddArtistModal
          artist={artistToAdd}
          onClose={handleModalClose}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}

export default SearchResultsPage;

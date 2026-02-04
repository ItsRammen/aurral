import { useState, useEffect } from "react";
import { useToast } from "../contexts/ToastContext";
import { getLidarrArtists, deleteArtistFromLidarr, getLikedArtists, toggleLikeArtist } from "../utils/api";

// Components
import LibraryHeader from "../components/library/LibraryHeader";
import LibraryControls from "../components/library/LibraryControls";
import ArtistGrid from "../components/library/ArtistGrid";
import LibraryStats from "../components/library/LibraryStats";
import EmptyState from "../components/library/EmptyState";
import { Loader } from "lucide-react";

function LibraryPage() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingArtist, setDeletingArtist] = useState(null);
  const [likedArtists, setLikedArtists] = useState([]);
  const [likingArtist, setLikingArtist] = useState(null);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("browse");

  const ITEMS_PER_PAGE = 24;
  const { showSuccess, showError } = useToast();

  const fetchArtists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLidarrArtists();
      setArtists(data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch artists from Lidarr",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
    getLikedArtists().then(setLikedArtists).catch(console.error);
  }, []);

  // Helper to standardize artist object for toggleLikeArtist
  const getArtistImage = (artist) => {
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

  const handleDeleteArtist = async (artist) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${artist.artistName}" from Lidarr?\n\nThis will not delete the artist's files.`,
    );

    if (!confirmDelete) return;

    setDeletingArtist(artist.id);
    try {
      await deleteArtistFromLidarr(artist.id, false);
      setArtists((prev) => prev.filter((a) => a.id !== artist.id));
      showSuccess(`Successfully removed ${artist.artistName} from Lidarr`);
      // If page becomes empty, go back one page
      if (
        currentPage > 1 &&
        artists.length - 1 <= (currentPage - 1) * ITEMS_PER_PAGE
      ) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      showError(
        `Failed to delete artist: ${err.response?.data?.message || err.message}`,
      );
    } finally {
      setDeletingArtist(null);
    }
  };

  const handleToggleLike = async (e, artist) => {
    e.stopPropagation();
    setLikingArtist(artist.id);

    // Standardize artist object
    const artistObj = {
      id: artist.foreignArtistId,
      name: artist.artistName,
      image: getArtistImage(artist)
    };

    try {
      const result = await toggleLikeArtist(artistObj.id, artistObj.name, artistObj.image);
      if (result.liked) {
        setLikedArtists(prev => [...prev, artistObj.id]);
      } else {
        setLikedArtists(prev => prev.filter(id => id !== artistObj.id));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      showError("Failed to update like status");
    } finally {
      setLikingArtist(null);
    }
  };

  const getFilteredAndSortedArtists = () => {
    let filtered = artists;

    if (searchTerm) {
      filtered = filtered.filter((artist) =>
        artist.artistName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.artistName.localeCompare(b.artistName);
        case "added":
          return new Date(b.added) - new Date(a.added);
        case "albums":
          return (
            (b.statistics?.albumCount || 0) - (a.statistics?.albumCount || 0)
          );
        default:
          return 0;
      }
    });

    return sorted;
  };

  // Reset page when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const filteredArtists = getFilteredAndSortedArtists();
  const totalPages = Math.ceil(filteredArtists.length / ITEMS_PER_PAGE);

  const currentArtists = filteredArtists.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* Header */}
      <LibraryHeader
        totalArtists={artists.length}
        loading={loading}
        onRefresh={fetchArtists}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'stats' ? (
        <LibraryStats />
      ) : (
        <>
          <LibraryControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {loading ? (
            <div className="flex flex-col justify-center items-center py-32">
              <Loader className="w-12 h-12 text-primary-600 animate-spin mb-4" />
              <p className="text-gray-500 font-bold">Loading your library...</p>
            </div>
          ) : error ? (
            <EmptyState
              type="error"
              onAction={fetchArtists}
              actionLabel="Try Again"
            />
          ) : artists.length === 0 ? (
            <EmptyState
              type="empty"
              onAction={() => window.location.href = '/search'}
              actionLabel="Find Artists"
            />
          ) : filteredArtists.length === 0 ? (
            <EmptyState
              type="search"
              searchTerm={searchTerm}
              onAction={() => setSearchTerm("")}
            />
          ) : (
            <ArtistGrid
              artists={currentArtists}
              likedArtists={likedArtists}
              onToggleLike={handleToggleLike}
              onDelete={handleDeleteArtist}
              deletingArtist={deletingArtist}
              likingArtist={likingArtist}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}

export default LibraryPage;

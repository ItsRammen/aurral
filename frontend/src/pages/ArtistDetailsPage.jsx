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
} from "lucide-react";
import {
  getArtistDetails,
  getArtistCover,
  lookupArtistInLidarr,
} from "../utils/api";
import AddArtistModal from "../components/AddArtistModal";

function ArtistDetailsPage() {
  const { mbid } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [coverImages, setCoverImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existsInLidarr, setExistsInLidarr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      setError(null);

      try {
        const artistData = await getArtistDetails(mbid);
        setArtist(artistData);

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
        } catch (err) {
          console.error("Failed to lookup artist in Lidarr:", err);
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

  const handleAddArtistClick = () => {
    setShowAddModal(true);
  };

  const handleAddSuccess = (artist) => {
    setExistsInLidarr(true);
    setShowAddModal(false);
    alert(`Successfully added ${artist.name} to Lidarr!`);
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
              ) : (
                <button
                  onClick={handleAddArtistClick}
                  className="btn btn-primary inline-flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add to Lidarr
                </button>
              )}

              <a
                href={`https://musicbrainz.org/artist/${mbid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary inline-flex items-center"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                View on MusicBrainz
              </a>
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
            {artist.genres &&
              artist.genres.map((genre, idx) => (
                <span
                  key={`genre-${idx}`}
                  className="badge badge-primary text-sm px-3 py-1"
                >
                  {genre.name}
                </span>
              ))}
            {artist.tags &&
              artist.tags.map((tag, idx) => (
                <span
                  key={`tag-${idx}`}
                  className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-3 py-1"
                >
                  {tag.name}
                </span>
              ))}
          </div>
        </div>
      )}

      {artist["release-groups"] && artist["release-groups"].length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Albums & Releases ({artist["release-groups"].length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {artist["release-groups"]
              .sort((a, b) => {
                const dateA = a["first-release-date"] || "";
                const dateB = b["first-release-date"] || "";
                return dateB.localeCompare(dateA);
              })
              .map((releaseGroup) => (
                <div
                  key={releaseGroup.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {releaseGroup.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {releaseGroup["first-release-date"] && (
                        <span>
                          {releaseGroup["first-release-date"].split("-")[0]}
                        </span>
                      )}
                      {releaseGroup["primary-type"] && (
                        <span className="badge badge-primary text-xs">
                          {releaseGroup["primary-type"]}
                        </span>
                      )}
                      {releaseGroup["secondary-types"] &&
                        releaseGroup["secondary-types"].length > 0 && (
                          <span className="badge bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                            {releaseGroup["secondary-types"].join(", ")}
                          </span>
                        )}
                    </div>
                  </div>
                  <a
                    href={`https://musicbrainz.org/release-group/${releaseGroup.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm ml-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}

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

      {showAddModal && artist && (
        <AddArtistModal
          artist={{
            id: mbid,
            name: artist.name,
            type: artist.type,
            country: artist.country,
            "life-span": artist["life-span"],
          }}
          onClose={handleModalClose}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}

export default ArtistDetailsPage;

import { useState, useEffect, useMemo } from "react";

import { X, Loader, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Disc, Music, Settings, Search } from "lucide-react";
import {
  getLidarrRootFolders,
  getLidarrQualityProfiles,
  getLidarrMetadataProfiles,
  addArtistToLidarr,
  getAppSettings,
  getArtistDetails,
} from "../utils/api";
import LoadingSpinner from "./LoadingSpinner";

function AddArtistModal({ artist, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rootFolders, setRootFolders] = useState([]);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [metadataProfiles, setMetadataProfiles] = useState([]);
  const [selectedRootFolder, setSelectedRootFolder] = useState("");
  const [selectedQualityProfile, setSelectedQualityProfile] = useState("");
  const [selectedMetadataProfile, setSelectedMetadataProfile] = useState("");
  const [searchForMissingAlbums, setSearchForMissingAlbums] = useState(true);
  const [albumFolders, setAlbumFolders] = useState(true);
  const [selectedAlbums, setSelectedAlbums] = useState(new Set());
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  // Selection mode: "artist-only" | "all" | "custom" | null
  const [selectionMode, setSelectionMode] = useState(null);

  const [fullArtist, setFullArtist] = useState(artist);

  // Group releases by type
  const releaseGroups = useMemo(() => {
    if (!fullArtist?.["release-groups"]) return { albums: [], singlesEps: [], other: [] };

    const sorted = [...fullArtist["release-groups"]].sort((a, b) =>
      (b["first-release-date"] || "").localeCompare(a["first-release-date"] || "")
    );

    return {
      albums: sorted.filter(rg => rg["primary-type"] === "Album"),
      singlesEps: sorted.filter(rg => ["Single", "EP"].includes(rg["primary-type"])),
      other: sorted.filter(rg => !["Album", "Single", "EP"].includes(rg["primary-type"]))
    };
  }, [fullArtist]);

  const totalAlbums = releaseGroups.albums.length;
  const visibleAlbums = showAllAlbums ? releaseGroups.albums : releaseGroups.albums.slice(0, 5);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        const promises = [
          getLidarrRootFolders(),
          getLidarrQualityProfiles(),
          getLidarrMetadataProfiles(),
          getAppSettings(),
        ];

        // If artist details are missing release groups, fetch them
        let fetchedArtist = null;
        if (!artist["release-groups"]) {
          promises.push(getArtistDetails(artist.id).then(data => {
            fetchedArtist = data;
            return data;
          }));
        }

        const results = await Promise.all(promises);
        const folders = results[0];
        const quality = results[1];
        const metadata = results[2];
        const savedSettings = results[3];

        if (fetchedArtist) {
          setFullArtist(prev => ({ ...prev, ...fetchedArtist }));
        }

        setRootFolders(folders);
        setQualityProfiles(quality);
        setMetadataProfiles(metadata);

        setSelectedRootFolder(
          savedSettings.rootFolderPath || (folders[0]?.path ?? ""),
        );
        setSelectedQualityProfile(
          savedSettings.qualityProfileId || (quality[0]?.id ?? ""),
        );
        setSelectedMetadataProfile(
          savedSettings.metadataProfileId || (metadata[0]?.id ?? ""),
        );
        setSearchForMissingAlbums(savedSettings.searchForMissingAlbums ?? true);
        setAlbumFolders(savedSettings.albumFolders ?? true);
      } catch (err) {
        console.error("Error loading modal data:", err);
        setError(
          err.response?.data?.message || "Failed to load configuration options",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [artist]);

  // When selection mode changes, update album selection accordingly
  useEffect(() => {
    if (selectionMode === "all") {
      setSelectedAlbums(new Set(releaseGroups.albums.map(rg => rg.id)));
    } else if (selectionMode === "artist-only") {
      setSelectedAlbums(new Set());
    }
    // "custom" mode keeps the current selection
  }, [selectionMode, releaseGroups.albums]);

  const handleSelectMode = (mode) => {
    if (selectionMode === mode) {
      setSelectionMode(null); // Toggle off
    } else {
      setSelectionMode(mode);
    }
  };

  const handleSubmit = async () => {
    if (
      !selectedRootFolder ||
      !selectedQualityProfile ||
      !selectedMetadataProfile
    ) {
      setError("Please configure Lidarr settings first");
      setShowAdvanced(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Determine what to monitor based on selection
      let monitorOption = "none";
      let albumsToSend = [];
      const hasAlbumsSelected = selectedAlbums.size > 0;

      if (selectionMode === "all" || (selectionMode === "custom" && hasAlbumsSelected)) {
        // If "all" mode, use "all" monitor option
        // If custom with albums, send specific albums
        if (selectionMode === "all") {
          monitorOption = "all";
          albumsToSend = [];
        } else {
          monitorOption = "none"; // We're sending specific albums
          albumsToSend = fullArtist["release-groups"]
            .filter((rg) => selectedAlbums.has(rg.id))
            .map((rg) => ({ id: rg.id, title: rg.title }));
        }
      } else {
        // Artist only - no albums
        monitorOption = "none";
        albumsToSend = [];
      }

      // Force search when albums are selected
      const shouldSearch = hasAlbumsSelected || selectionMode === "all";

      const response = await addArtistToLidarr({
        foreignArtistId: artist.id,
        artistName: artist.name,
        qualityProfileId: parseInt(selectedQualityProfile),
        metadataProfileId: parseInt(selectedMetadataProfile),
        rootFolderPath: selectedRootFolder,
        monitored: true,
        monitor: monitorOption,
        searchForMissingAlbums: shouldSearch, // Auto-search when albums selected
        albumFolders,
        albums: albumsToSend,
      });

      onSuccess(artist, {
        ...response,
        addMode: selectionMode || "artist-only",
        albumCount: selectionMode === "all" ? totalAlbums : selectedAlbums.size,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add artist to Lidarr");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAlbum = (albumId) => {
    const next = new Set(selectedAlbums);
    if (next.has(albumId)) {
      next.delete(albumId);
    } else {
      next.add(albumId);
    }
    setSelectedAlbums(next);
    setSelectionMode("custom"); // Switch to custom mode when manually selecting
  };

  const selectAllAlbums = () => {
    setSelectedAlbums(new Set(releaseGroups.albums.map(rg => rg.id)));
    setSelectionMode("custom");
  };

  const selectNone = () => {
    setSelectedAlbums(new Set());
    setSelectionMode("custom");
  };

  // Determine confirmation button text
  const getConfirmButtonText = () => {
    if (selectionMode === "all") {
      return `Add with All ${totalAlbums} Albums`;
    } else if (selectionMode === "artist-only") {
      return "Add Artist Only";
    } else if (selectedAlbums.size > 0) {
      return `Add with ${selectedAlbums.size} Album${selectedAlbums.size !== 1 ? 's' : ''}`;
    }
    return "Select an option above";
  };

  const canSubmit = selectionMode !== null || selectedAlbums.size > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Add to Library
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {artist.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="xl" text="Loading configuration..." />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 flex items-start mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-900 dark:text-red-400 font-semibold">
                  Error
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          ) : null}

          {!loading && (
            <div className="space-y-6">
              {/* Quick Selection Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSelectMode("artist-only")}
                  disabled={submitting}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectionMode === "artist-only"
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/50"
                    : "border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                >
                  <Music className={`w-8 h-8 mb-2 ${selectionMode === "artist-only" ? "text-primary-500" : "text-gray-400"}`} />
                  <span className={`font-semibold ${selectionMode === "artist-only" ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-gray-100"}`}>
                    Artist Only
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add now, select albums later</span>
                </button>

                <button
                  onClick={() => handleSelectMode("all")}
                  disabled={submitting}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectionMode === "all"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/50"
                    : "border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                >
                  <Disc className={`w-8 h-8 mb-2 ${selectionMode === "all" ? "text-green-500" : "text-gray-400"}`} />
                  <span className={`font-semibold ${selectionMode === "all" ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-gray-100"}`}>
                    All Albums
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {totalAlbums > 0 ? `Monitor ${totalAlbums} album${totalAlbums !== 1 ? 's' : ''} + search` : 'No albums found'}
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    or choose specific albums
                  </span>
                </div>
              </div>

              {/* Album Selection */}
              {releaseGroups.albums.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Albums ({selectedAlbums.size} of {totalAlbums} selected)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllAlbums}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={selectNone}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                    {visibleAlbums.map((rg) => (
                      <label
                        key={rg.id}
                        className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${selectedAlbums.has(rg.id)
                          ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAlbums.has(rg.id)}
                          onChange={() => toggleAlbum(rg.id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded focus:ring-primary-500"
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {rg.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {rg["first-release-date"]?.split("-")[0] || "Unknown"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {totalAlbums > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAlbums(!showAllAlbums)}
                      className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2"
                    >
                      {showAllAlbums ? `Show less` : `Show all ${totalAlbums} albums`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No albums found for this artist</p>
                </div>
              )}

              {/* Search indicator */}
              {(selectionMode === "all" || selectedAlbums.size > 0) && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4" />
                  <span>Lidarr will automatically search for selected albums</span>
                </div>
              )}

              {/* Confirmation Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !canSubmit}
                className={`w-full h-12 rounded-lg font-semibold flex items-center justify-center transition-all ${canSubmit
                  ? "btn btn-primary"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Adding to Lidarr...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {getConfirmButtonText()}
                  </>
                )}
              </button>

              {/* Advanced Settings Toggle */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Settings
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Root Folder
                      </label>
                      <select
                        value={selectedRootFolder}
                        onChange={(e) => setSelectedRootFolder(e.target.value)}
                        className="input"
                        disabled={submitting}
                      >
                        {rootFolders.map((folder) => (
                          <option key={folder.id} value={folder.path}>
                            {folder.path}
                            {folder.freeSpace &&
                              ` (${(folder.freeSpace / 1024 / 1024 / 1024).toFixed(2)} GB free)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quality Profile
                      </label>
                      <select
                        value={selectedQualityProfile}
                        onChange={(e) => setSelectedQualityProfile(e.target.value)}
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
                        value={selectedMetadataProfile}
                        onChange={(e) => setSelectedMetadataProfile(e.target.value)}
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

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="albumFolders"
                        checked={albumFolders}
                        onChange={(e) => setAlbumFolders(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded focus:ring-primary-500"
                        disabled={submitting}
                      />
                      <label htmlFor="albumFolders" className="ml-3">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Album Folders</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Create separate folder per album</p>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancel button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddArtistModal;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ExternalLink, Heart, Trash2, Loader, Disc, ListMusic } from 'lucide-react';
import ArtistImage from '../ArtistImage';
import ArtistStatusBadge from '../ArtistStatusBadge';

const ArtistCard = ({ artist, isLiked, onToggleLike, onDelete, isDeleting, isLiking }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    const getArtistImage = (artist) => {
        // Use local proxy if we have an MBID (foreignArtistId in Lidarr)
        if (artist.foreignArtistId) {
            return `/api/artists/${artist.foreignArtistId}/image`;
        }
        // Fallback to Lidarr mediacover
        if (artist.images && artist.images.length > 0 && artist.id) {
            const posterImage = artist.images.find(
                (img) => img.coverType === "poster" || img.coverType === "fanart",
            );
            const image = posterImage || artist.images[0];
            const coverType = image.coverType || "poster";
            const filename = `${coverType}.jpg`;
            return `/api/lidarr/mediacover/${artist.id}/${filename}`;
        }
        return null;
    };

    const image = getArtistImage(artist);
    const addedDate = artist.added ? new Date(artist.added).toLocaleDateString() : 'Unknown';

    return (
        <div
            className="group relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary-500/20 hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Container */}
            <div
                className="relative aspect-square overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800"
                onClick={() => navigate(`/artist/${artist.foreignArtistId}`)}
            >
                <ArtistImage
                    src={image}
                    mbid={artist.foreignArtistId}
                    alt={artist.artistName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Artist Status Badge */}
                <ArtistStatusBadge
                    artist={artist}
                    variant="pill"
                    className="absolute top-3 left-3"
                />

                {/* Quick Actions Overlay */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleLike(e, artist); }}
                        disabled={isLiking}
                        className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-all ${isLiked
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-white/90 dark:bg-black/60 text-gray-700 dark:text-gray-200 hover:text-red-500 hover:scale-110'
                            }`}
                        title={isLiked ? "Unlike" : "Like"}
                    >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                    </button>

                    <a
                        href={`https://musicbrainz.org/artist/${artist.foreignArtistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 text-gray-700 dark:text-gray-200 hover:text-primary-500 hover:scale-110 flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
                        title="View on MusicBrainz"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(artist); }}
                        disabled={isDeleting}
                        className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 text-gray-700 dark:text-gray-200 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 hover:scale-110 flex items-center justify-center backdrop-blur-md shadow-lg transition-all"
                        title="Delete from Library"
                    >
                        {isDeleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5">
                <h3
                    className="text-lg font-black text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4"
                    onClick={() => navigate(`/artist/${artist.foreignArtistId}`)}
                >
                    {artist.artistName}
                </h3>

                <div className="mb-4">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl w-full">
                        <ListMusic className="w-3.5 h-3.5 text-purple-500" />
                        <span title="Available / Total Tracks">
                            <span className="text-gray-900 dark:text-white">{artist.statistics?.trackFileCount || 0}</span>
                            <span className="opacity-60">/{artist.statistics?.trackCount || 0}</span> Tracks
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Added {addedDate}</span>
                    </div>
                    {artist.requestedBy && (
                        <div className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md">
                            Req: {artist.requestedBy}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArtistCard;

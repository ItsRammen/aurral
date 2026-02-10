import { useState, useEffect } from "react";
import { Music, Loader } from "lucide-react";

const ArtistImage = ({
  mbid,
  src,
  alt,
  className = "",
  showLoading = true,
}) => {
  // ALWAYS use proxy endpoint if mbid is available, ignore external src
  const getImageSource = () => {
    if (mbid) {
      return `/api/artists/${mbid}/image`;
    }
    // Fallback to provided src only if no mbid
    return src || null;
  };

  const [currentSrc, setCurrentSrc] = useState(getImageSource());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(getImageSource());
    setHasError(false);
    setIsLoading(true);
  }, [src, mbid]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError || !currentSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 ${className}`}
      >
        <Music className="w-1/3 h-1/3" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
    >
      {isLoading && showLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-200 dark:bg-gray-800">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt || "Artist cover"}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"
          }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};

export default ArtistImage;

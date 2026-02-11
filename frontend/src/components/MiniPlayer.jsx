import { useEffect, useState } from "react";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";
import { X, Music, Loader2 } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";

function MiniPlayer() {
  const { currentTrack, audioRef, stop, playNext, setIsPlaying } = usePlayer();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-play when track changes
    if (currentTrack && audioRef.current?.audio?.current) {
      setIsLoading(true);
      const playPromise = audioRef.current.audio.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch((e) => {
            console.warn("Auto-play prevented:", e);
            setIsLoading(false);
            setIsPlaying(false);
          });
      }
    }
  }, [currentTrack, audioRef, setIsPlaying]);

  if (!currentTrack) return null;

  // Get auth token for streaming URL (HTML5 audio can't use Authorization headers)
  const authToken = token;
  const streamUrl = `/api/navidrome/stream/${currentTrack.id}?token=${encodeURIComponent(authToken || "")}`;
  const coverUrl = currentTrack.coverArt ? `${currentTrack.coverArt}?token=${encodeURIComponent(authToken || "")}` : null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-80 md:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20">
      {/* Close Button - Top Right */}
      <button
        onClick={stop}
        className="absolute -top-2 -right-2 p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shadow-md z-10"
        title="Close Player"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-3">
        {/* Track Info Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 group">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 backdrop-blur-[1px]">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}

            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentTrack.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Audio Player */}
        <div className="miniplayer-container">
          <AudioPlayer
            ref={audioRef}
            src={streamUrl}
            autoPlay
            preload="auto"
            showJumpControls={false}
            showDownloadProgress={false}
            showFilledProgress
            layout="horizontal"
            customAdditionalControls={[]}
            customVolumeControls={[]}
            onPlay={() => {
              setIsPlaying(true);
              setIsLoading(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={playNext}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onEmptied={() => setIsLoading(true)}
            onError={(e) => {
              console.error("Audio error:", e);
              setIsLoading(false);
            }}
          />
        </div>
      </div>

      <style>{`
        .miniplayer-container .rhap_container {
          background: transparent;
          box-shadow: none;
          padding: 0;
        }
        .miniplayer-container .rhap_main {
          flex-direction: column;
          gap: 0.5rem;
        }
        .miniplayer-container .rhap_controls-section {
          flex: 0 0 auto;
          margin: 0;
          justify-content: center;
        }
        .miniplayer-container .rhap_progress-section {
          flex: 1;
          padding: 0;
        }
        .miniplayer-container .rhap_time {
          color: #9ca3af;
          font-size: 0.65rem;
        }
        .miniplayer-container .rhap_progress-bar {
          background: #e5e7eb;
          height: 4px;
          border-radius: 2px;
        }
        .dark .miniplayer-container .rhap_progress-bar {
          background: #374151;
        }
        .miniplayer-container .rhap_progress-filled {
          background: linear-gradient(to right, #8b5cf6, #a855f7);
          border-radius: 2px;
        }
        .miniplayer-container .rhap_progress-indicator {
          background: #8b5cf6;
          width: 10px;
          height: 10px;
          top: -3px;
          margin-left: -5px;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.4);
        }
        .miniplayer-container .rhap_button-clear {
          color: #6b7280;
        }
        .miniplayer-container .rhap_button-clear:hover {
          color: #8b5cf6;
        }
        .miniplayer-container .rhap_play-pause-button {
          font-size: 1.5rem;
          width: 2rem;
          height: 2rem;
        }
      `}</style>
    </div>
  );
}

export default MiniPlayer;

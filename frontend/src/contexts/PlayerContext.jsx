import { createContext, useContext, useState, useRef, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const audioRef = useRef(null);

    const play = useCallback((track) => {
        // Track should have: id, title, artist, album, coverArt (optional)
        setCurrentTrack(track);
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => {
        setIsPlaying(false);
        if (audioRef.current?.audio?.current) {
            audioRef.current.audio.current.pause();
        }
    }, []);

    const resume = useCallback(() => {
        setIsPlaying(true);
        if (audioRef.current?.audio?.current) {
            audioRef.current.audio.current.play();
        }
    }, []);

    const stop = useCallback(() => {
        setCurrentTrack(null);
        setIsPlaying(false);
        setQueue([]);
    }, []);

    const addToQueue = useCallback((track) => {
        setQueue(prev => [...prev, track]);
    }, []);

    const playNext = useCallback(() => {
        if (queue.length > 0) {
            const [nextTrack, ...rest] = queue;
            setQueue(rest);
            play(nextTrack);
        } else {
            stop();
        }
    }, [queue, play, stop]);

    const value = {
        currentTrack,
        isPlaying,
        queue,
        audioRef,
        play,
        pause,
        resume,
        stop,
        addToQueue,
        playNext,
        setIsPlaying
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}

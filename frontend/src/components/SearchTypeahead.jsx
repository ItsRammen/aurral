import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Disc, Music, Loader, CheckCircle } from "lucide-react";
import { searchSuggestions } from "../utils/api";

function SearchTypeahead({ onSearch }) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState({ artists: [], albums: [], recordings: [] });
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const navigate = useNavigate();

    // Debounced fetch
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setSuggestions({ artists: [], albums: [], recordings: [] });
            setIsOpen(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const data = await searchSuggestions(query, 3);
                setSuggestions(data);
                setIsOpen(true);
                setSelectedIndex(-1);
            } catch (e) {
                console.error("Suggestions failed:", e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const allItems = [
        ...suggestions.artists.map((a) => ({ ...a, category: "Artists" })),
        ...suggestions.albums.map((a) => ({ ...a, category: "Albums" })),
        ...suggestions.recordings.map((r) => ({ ...r, category: "Songs" })),
    ];

    const handleKeyDown = (e) => {
        if (!isOpen || allItems.length === 0) {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, -1));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && allItems[selectedIndex]) {
                    handleSelect(allItems[selectedIndex]);
                } else {
                    handleSubmit();
                }
                break;
            case "Escape":
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleSelect = (item) => {
        setIsOpen(false);
        setQuery("");
        if (item.category === "Artists" && item.id) {
            navigate(`/artist/${item.id}`);
        } else if (item.category === "Albums") {
            navigate(`/search?q=${encodeURIComponent(item.name)}&type=album`);
        } else {
            navigate(`/search?q=${encodeURIComponent(item.name)}`);
        }
    };

    const handleSubmit = () => {
        if (query.trim()) {
            setIsOpen(false);
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setQuery("");
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case "Artists":
                return <User className="w-4 h-4" />;
            case "Albums":
                return <Disc className="w-4 h-4" />;
            case "Songs":
                return <Music className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const hasResults = allItems.length > 0;

    return (
        <div ref={wrapperRef} className="relative flex-1">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                    ) : (
                        <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && hasResults && setIsOpen(true)}
                    placeholder="Search artists, albums, or songs..."
                    className="block w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow shadow-sm"
                    autoComplete="off"
                />
            </form>

            {/* Dropdown */}
            {isOpen && hasResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {["Artists", "Albums", "Songs"].map((category) => {
                        const items = allItems.filter((i) => i.category === category);
                        if (items.length === 0) return null;

                        return (
                            <div key={category}>
                                <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                                    {getCategoryIcon(category)}
                                    {category}
                                </div>
                                {items.map((item, idx) => {
                                    const globalIdx = allItems.indexOf(item);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedIndex === globalIdx ? "bg-primary-50 dark:bg-primary-900/20" : ""
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                                                    {item.name}
                                                    {item.inLibrary && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                                                            <CheckCircle className="w-3 h-3" />
                                                            In Library
                                                        </span>
                                                    )}
                                                </p>
                                                {item.artist && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {item.artist}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {/* Full Search Button */}
                    <button
                        onClick={handleSubmit}
                        className="w-full px-4 py-3 text-center text-sm font-medium text-primary-600 dark:text-primary-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700"
                    >
                        View all results for "{query}"
                    </button>
                </div>
            )}
        </div>
    );
}

export default SearchTypeahead;

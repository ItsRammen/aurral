
import { lidarrRequest, loadSettings } from "../services/api.js";

async function run() {
    try {
        await loadSettings();
        console.log("Fetching artists...");
        const artists = await lidarrRequest("/artist");

        if (artists && artists.length > 0) {
            const artist = artists[0];
            console.log("Found artist:", artist.artistName);
            console.log(JSON.stringify(artist, null, 2));
        } else {
            console.log("No artists found in Lidarr (or API returned null/empty).");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

run();

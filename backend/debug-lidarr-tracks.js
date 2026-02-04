
import { lidarrRequest } from "./src/services/api.js";
import { db } from "./src/config/db.js";
import dotenv from "dotenv";

dotenv.config();


async function run() {
    // Wait for DB connection if needed (though top-level await in db.js should block)
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        console.log("Fetching artists to find Nirvana...");
        const artists = await lidarrRequest("/artist");

        if (!artists) {
            console.error("lidarrRequest('/artist') returned null/undefined.");
            return;
        }



        const nirvana = artists.find(a => a.artistName === "Nirvana");

        if (!nirvana) {
            console.error("Nirvana not found in Lidarr.");
            return;
        }
        console.log(`Found Nirvana: ID ${nirvana.id}`);

        console.log("Fetching albums for Nirvana...");
        const albums = await lidarrRequest(`/album?artistId=${nirvana.id}`);
        const nevermind = albums.find(a => a.title === "Nevermind");

        if (!nevermind) {
            console.error("Nevermind not found.");
            return;
        }
        console.log(`Found Nevermind: ID ${nevermind.id}`);

        console.log(`Fetching tracks for Nevermind (Album ID: ${nevermind.id})...`);
        const tracks = await lidarrRequest(`/track?albumId=${nevermind.id}`);

        console.log(`Total Tracks Returned: ${tracks.length}`);

        // Check for duplicates
        const trackCounts = {};
        tracks.forEach(t => {
            const key = `${t.trackNumber}-${t.title}`;
            trackCounts[key] = (trackCounts[key] || 0) + 1;
        });

        const duplicates = Object.entries(trackCounts).filter(([k, v]) => v > 1);

        if (duplicates.length > 0) {
            console.log("Duplicates found:");
            duplicates.forEach(([k, v]) => console.log(`- ${k}: ${v} times`));
        } else {
            console.log("No duplicates found by (TrackNumber-Title).");
        }

        // Print first 5 tracks
        console.log("First 5 tracks:", JSON.stringify(tracks.slice(0, 5), null, 2));

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

run();

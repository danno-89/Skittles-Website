import { db, collection, getDocs, query, where, limit } from './firebase.config.js';

async function getStatistics() {
    let matchResultsSnapshot;
    let documents = [];

    try {
        // 1. Try to find the "current" season explicitly
        const seasonsQuery = query(collection(db, 'seasons'), where('status', '==', 'current'), limit(1));
        const seasonsSnapshot = await getDocs(seasonsQuery);

        if (!seasonsSnapshot.empty) {
            const currentSeason = seasonsSnapshot.docs[0].id;
            const q = query(collection(db, 'match_results'), where('season', '==', currentSeason));
            matchResultsSnapshot = await getDocs(q);
            documents = matchResultsSnapshot.docs.map(doc => doc.data());
        } else {
            // 2. Fallback: Fetch all and determine latest season
            matchResultsSnapshot = await getDocs(collection(db, 'match_results'));
            const allDocs = matchResultsSnapshot.docs.map(doc => doc.data());

            const uniqueSeasons = [...new Set(allDocs.map(d => d.season).filter(Boolean))];
            uniqueSeasons.sort((a, b) => b.localeCompare(a)); // Descending e.g. "2025-26", "2024-25"

            const latestSeason = uniqueSeasons[0];
            if (latestSeason) {
                documents = allDocs.filter(d => d.season === latestSeason);
            } else {
                documents = allDocs;
            }
        }
    } catch (error) {
        console.error("Error fetching statistics:", error);
        return { pins: 0, completedMatches: 0, totalMatches: 0, postponements: 0 };
    }

    // Calculate stats based on the filtered 'documents' array
    let pins = 0;
    let completedMatches = 0;
    let postponements = 0;
    const totalMatches = documents.length; // Count only filtered matches

    documents.forEach(data => {
        // A match is considered completed if it has a score.
        if (data.homeScore != null && data.awayScore != null) {
            completedMatches++;
            pins += (data.homeScore || 0) + (data.awayScore || 0);
        }

        if (data.status === 'postponed') {
            postponements++;
        }
    });

    return { pins, completedMatches, totalMatches, postponements };
}

export { getStatistics };

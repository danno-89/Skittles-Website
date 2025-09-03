import { db, collection, getDocs } from './firebase.config.js';

async function getStatistics() {
    const matchResultsCollection = collection(db, 'match_results');
    const matchResultsSnapshot = await getDocs(matchResultsCollection);

    let pins = 0;
    let completedMatches = 0;
    let postponements = 0;
    const totalMatches = matchResultsSnapshot.size;

    matchResultsSnapshot.forEach(doc => {
        const data = doc.data();

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

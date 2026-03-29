const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const v1functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Helper to fetch configuration from Firebase config.
 * To set these values, run in your terminal:
 * firebase functions:config:set social.fb_token="..." social.fb_page_id="..."
 */
const getConfig = () => {
    return {
        fbToken: process.env.FB_TOKEN,
        fbPageId: process.env.FB_PAGE_ID
    };
};

/**
 * Checks if the requesting user is an admin (committee member).
 */
async function isCommitteeMember(uid) {
    if (!uid) return false;
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data().committee === true;
}

/**
 * Called by the Admin UI to approve and publish a post to Facebook.
 */
exports.publishFacebookPost = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const authorized = await isCommitteeMember(request.auth.uid);
    if (!authorized) {
        throw new HttpsError('permission-denied', 'Only committee members can publish to Facebook.');
    }

    const { content, postId } = request.data;
    if (!content) {
        throw new HttpsError('invalid-argument', 'Content is required.');
    }

    const config = getConfig();
    if (!config.fbToken || !config.fbPageId) {
        throw new HttpsError('failed-precondition', 'Facebook integration is not configured.');
    }

    try {
        let postData = {};
        if (postId) {
            const docSnap = await db.collection("social_pending_posts").doc(postId).get();
            if (docSnap.exists) postData = docSnap.data();
        }

        let fbUrl = `https://graph.facebook.com/v19.0/${config.fbPageId}/feed`;
        const payload = {
            access_token: config.fbToken
        };

        if (postData.format === 'link' && postData.linkUrl) {
            payload.message = content;
            payload.link = postData.linkUrl;
        } else if (postData.format === 'image' && postData.imageUrl) {
            fbUrl = `https://graph.facebook.com/v19.0/${config.fbPageId}/photos`;
            payload.caption = content;
            payload.url = postData.imageUrl;
        } else {
            payload.message = content;
        }

        const response = await fetch(fbUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Facebook API Error:", data);
            throw new Error(data.error?.message || 'Failed to post to Facebook');
        }

        // Mark post as published in Firestore if a postId was provided
        if (postId) {
            await db.collection("social_pending_posts").doc(postId).update({
                status: 'published',
                publishedAt: admin.firestore.Timestamp.now(),
                fbPostId: data.id
            });
        }

        return { success: true, fbPostId: data.id };
    } catch (error) {
        console.error("Error publishing to Facebook:", error);
        throw new HttpsError('invalid-argument', 'DEBUG: ' + (error.message || error.toString()));
    }
});

/**
 * Generates a purely text-based representation of the active league tables.
 */
async function buildLeagueTableText() {
    try {
        const teamsSnap = await db.collection("teams").get();
        const teamsMap = {};
        teamsSnap.forEach(doc => { teamsMap[doc.id] = doc.data().name; });

        const seasonsSnap = await db.collection("league_tables").get();
        if (seasonsSnap.empty) return "League Tables not available.";
        
        const seasons = seasonsSnap.docs.map(d => d.id).sort((a, b) => b.localeCompare(a));
        const currentSeasonId = seasons.includes('2025-26') ? '2025-26' : seasons[0];
        const leagueData = seasonsSnap.docs.find(d => d.id === currentSeasonId).data();
        
        const getDivisionRank = (key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('premier')) return 0;
            if (lowerKey.includes('first') || lowerKey.includes('1')) return 1;
            if (lowerKey.includes('second') || lowerKey.includes('2')) return 2;
            if (lowerKey.includes('third') || lowerKey.includes('3')) return 3;
            return 100;
        };
        
        const sortedDivisionKeys = Object.keys(leagueData)
            .filter(key => key !== 'season' && typeof leagueData[key] === 'object' && leagueData[key] !== null && !key.toLowerCase().includes('knockout'))
            .sort((a, b) => getDivisionRank(a) - getDivisionRank(b));
            
        let finalOutput = `🏆 Current Standings (${currentSeasonId})\n\n`;

        for (const divKey of sortedDivisionKeys) {
            const division = leagueData[divKey];
            if (!division.standings || division.standings.length === 0) continue;
            
            const divName = division.leagueName || divKey.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
            finalOutput += `--- ${divName} ---\n`;
            
            let standings = division.standings.map(t => {
                t.teamName = teamsMap[t.teamId] || 'Unknown Team';
                t.played = t.played || 0;
                t.points = t.points || 0;
                t.pinsFor = t.pinsFor || 0;
                t.max_score = t.max_score || 0;
                return t;
            });
            
            standings.sort((a, b) => {
                const aAve = a.played > 0 ? a.pinsFor / a.played : 0;
                const bAve = b.played > 0 ? b.pinsFor / b.played : 0;
                if (b.points !== a.points) return b.points - a.points;
                if (bAve !== aAve) return bAve - aAve;
                if (b.pinsFor !== a.pinsFor) return b.pinsFor - a.pinsFor;
                if (b.max_score !== a.max_score) return b.max_score - a.max_score;
                return a.teamName.localeCompare(b.teamName);
            });
            
            standings.forEach((t, index) => {
                finalOutput += `${index + 1}. ${t.teamName} - ${t.points} pts (Pl: ${t.played})\n`;
            });
            
            finalOutput += `\n`;
        }
        
        return finalOutput.trim();
    } catch (e) {
        console.error("Error building league table text:", e);
        return "League Tables currently unavailable due to a system update.";
    }
}

/**
 * Shared helper to dynamically process templates and insert drafts into pending queue.
 */
async function processTemplateForDraft(templateData, templateId) {
    let finalContent = templateData.content;
    const now = new Date();
    const todayStr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' })).toLocaleDateString('en-GB');

    // 1. Parse static Date placeholders
    finalContent = finalContent.replace(/{date}/g, todayStr);

    // 2. Parse dynamic League Table builder
    if (finalContent.includes('{league_table}')) {
        const tableStr = await buildLeagueTableText();
        finalContent = finalContent.replace(/{league_table}/g, tableStr);
    }

    // 3. Fallback for legacy {stats} placeholder if weekly_stats
    if (templateData.trigger === 'weekly_stats' && finalContent.includes('{stats}')) {
        const placeholderStats = "Top Scorer: John Doe (45)\\nTrailing: Jane Smith (42)";
        finalContent = finalContent.replace(/{stats}/g, placeholderStats);
    }

    // 4. Save to pending posts queue carrying formats forward
    await db.collection("social_pending_posts").add({
        sourceTemplateId: templateId,
        trigger: templateData.trigger || 'custom',
        format: templateData.format || 'text',
        linkUrl: templateData.linkUrl || null,
        imageUrl: templateData.imageUrl || null,
        content: finalContent,
        status: 'pending',
        generatedAt: admin.firestore.Timestamp.now()
    });
}

/**
 * Helper to generate the weekly stats post draft manually (Trigger: Test Button).
 */
async function generateStatsDraft() {
    const templatesSnap = await db.collection("social_templates").where("trigger", "==", "weekly_stats").limit(1).get();
    if (templatesSnap.empty) {
        throw new Error("No weekly stats template found. Please create one with the trigger 'weekly_stats' in the Templates Manager.");
    }
    await processTemplateForDraft(templatesSnap.docs[0].data(), templatesSnap.docs[0].id);
    console.log("Weekly stats draft manually generated successfully.");
}

/**
 * Master Social Media Scheduler
 * Checks every hour if any templates are scheduled for this specific Day & Hour.
 */
exports.masterSocialScheduler = onSchedule({
    schedule: "0 * * * *",
    timeZone: "Europe/London",
    region: "europe-west1"
}, async (event) => {
    try {
        console.log("Master Scheduler waking up to check for scheduled templates...");
        
        const now = new Date();
        const localTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/London' });
        const localTime = new Date(localTimeStr);
        const currentDay = localTime.getDay();
        const currentHour = localTime.getHours();

        console.log(`Checking for templates scheduled for Day ${currentDay}, Hour ${currentHour}...`);

        const templatesQuery = await db.collection("social_templates").where("isScheduled", "==", true).get();
        if (templatesQuery.empty) return;

        const matchingDocs = templatesQuery.docs.filter(doc => {
            const data = doc.data();
            return data.scheduleDay === currentDay && data.scheduleHour === currentHour;
        });

        if (matchingDocs.length === 0) return;

        let generations = 0;
        for (const doc of matchingDocs) {
            console.log(`Generating draft for scheduled template: ${doc.data().name}`);
            await processTemplateForDraft(doc.data(), doc.id);
            generations++;
        }

        console.log(`Master Scheduler successful. Generated ${generations} new drafts.`);
    } catch (error) {
        console.error("Error running Master Scheduler:", error);
    }
});

/**
 * Manually triggerable HTTPS Callable proxy for generateStatsDraft.
 */
exports.manuallyGenerateStatsDraft = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const authorized = await isCommitteeMember(request.auth.uid);
    if (!authorized) throw new HttpsError('permission-denied', 'Only committee members can generate drafts.');

    try {
        await generateStatsDraft();
        return { success: true };
    } catch (error) {
        console.error("Error generating weekly stats manually:", error);
        throw new HttpsError('internal', error.message || 'Failed to generate stats draft.');
    }
});

/**
 * Triggers when a new document is added to the pending queue.
 * Sends an FCM push notification to Committee members.
 */
exports.notifyAdminOnNewDraft = onDocumentCreated({
    document: "social_pending_posts/{docId}",
    region: "europe-west1"
}, async (event) => {
    const postData = event.data.data();
    if (postData.status !== 'pending') return;

    try {
        // Find all committee members with an FCM token
        const committeeSnap = await db.collection("users").where("committee", "==", true).get();
        const tokens = [];
        committeeSnap.forEach(doc => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            } else if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log("No committee members have push notifications enabled.");
            return;
        }

        const message = {
            notification: {
                title: 'New Facebook Draft Pending!',
                body: 'A new automated post is waiting for your approval in the Admin Dashboard.'
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`${response.successCount} push notifications sent successfully.`);
        if (response.failureCount > 0) {
            console.warn(`${response.failureCount} messages failed to send.`);
        }
    } catch (error) {
        console.error("Error sending FCM notification:", error);
    }
});

import { db, collection, doc, getDocs, updateDoc, deleteDoc, setDoc, query, where, orderBy, Timestamp, functions, httpsCallable, auth, messaging, getToken, arrayUnion, onMessage } from './firebase.config.js';

export function initAdminSocial() {
    console.log("Initialising Social Media Admin Module...");

    // Elements for Templates
    const templatesList = document.getElementById('social-templates-list');
    const createTemplateBtn = document.getElementById('create-template-btn');
    const templateEditor = document.getElementById('template-editor-container');
    const saveTemplateBtn = document.getElementById('save-social-template-btn');
    const cancelTemplateBtn = document.getElementById('cancel-social-template-btn');

    const isScheduledCheckbox = document.getElementById('social-template-is-scheduled');
    const scheduleSettingsDiv = document.getElementById('social-template-schedule-settings');
    const scheduleDaySelect = document.getElementById('social-template-day');
    const scheduleHourSelect = document.getElementById('social-template-hour');

    if (isScheduledCheckbox) {
        isScheduledCheckbox.addEventListener('change', (e) => {
            scheduleSettingsDiv.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    const formatSelect = document.getElementById('social-template-format');
    const linkSettingsDiv = document.getElementById('social-template-link-settings');
    const imageSettingsDiv = document.getElementById('social-template-image-settings');

    if (formatSelect) {
        formatSelect.addEventListener('change', (e) => {
            linkSettingsDiv.style.display = e.target.value === 'link' ? 'block' : 'none';
            imageSettingsDiv.style.display = e.target.value === 'image' ? 'block' : 'none';
        });
    }

    // Elements for Pending Queue
    const pendingQueue = document.getElementById('social-pending-queue');
    const manualGenerateBtn = document.getElementById('manual-generate-stats-btn');

    // Elements for Notifications
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');
    const notificationStatus = document.getElementById('notification-status');

    if (notificationStatus && enableNotificationsBtn) {
        if (!("Notification" in window)) {
            notificationStatus.textContent = 'Push strictly not supported on this browser/device.';
            enableNotificationsBtn.style.display = 'none';
        } else if (Notification.permission === 'granted') {
            notificationStatus.textContent = 'Push Notifications ENABLED on this device. ✅';
            notificationStatus.style.color = 'green';
            enableNotificationsBtn.style.display = 'none';
        } else if (Notification.permission === 'denied') {
            notificationStatus.textContent = 'Push Notifications BLOCKED by browser. Please unblock in site settings. ❌';
            notificationStatus.style.color = 'red';
            enableNotificationsBtn.style.display = 'none';
        }
    }

    try {
        onMessage(messaging, (payload) => {
            console.log("Foreground push notification received: ", payload);
            alert("🔔 PUSH NOTIFICATION: " + (payload.notification?.title || "New Facebook Draft Pending!"));
            loadPendingPosts(document.getElementById('social-pending-queue'));
        });
    } catch (e) {
        console.warn("Could not bind foreground message listener", e);
    }

    let isEventsBound = false;

    // We use a small mutation observer or click listener to ensure we fetch data when the tab is shown
    const socialTabBtn = document.querySelector('.tab-link[data-tab="social-media"]');
    if (socialTabBtn && !isEventsBound) {
        socialTabBtn.addEventListener('click', () => {
            loadTemplates(templatesList);
            loadPendingPosts(pendingQueue);
        });
        isEventsBound = true;
    }

    if (createTemplateBtn) {
        createTemplateBtn.addEventListener('click', () => {
            document.getElementById('social-template-id').value = '';
            document.getElementById('social-template-name').value = '';
            document.getElementById('social-template-trigger').value = 'weekly_stats';
            document.getElementById('social-template-content').value = '';
            
            if (formatSelect) {
                formatSelect.value = 'text';
                linkSettingsDiv.style.display = 'none';
                imageSettingsDiv.style.display = 'none';
                document.getElementById('social-template-link-url').value = 'https://sarniaskittlesclub.com/league-tables.html';
                document.getElementById('social-template-image-url').value = '';
            }

            if (isScheduledCheckbox) {
                isScheduledCheckbox.checked = false;
                scheduleSettingsDiv.style.display = 'none';
                scheduleDaySelect.value = "0";
                scheduleHourSelect.value = "10";
            }
            
            templateEditor.style.display = 'block';
            createTemplateBtn.style.display = 'none';
        });
    }

    if (cancelTemplateBtn) {
        cancelTemplateBtn.addEventListener('click', () => {
            templateEditor.style.display = 'none';
            createTemplateBtn.style.display = 'inline-block';
        });
    }

    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', async () => {
            await saveTemplate(templateEditor, createTemplateBtn, templatesList);
        });
    }

    if (enableNotificationsBtn) {
        enableNotificationsBtn.addEventListener('click', async () => {
            await enablePushNotifications(notificationStatus);
        });
    }

    if (manualGenerateBtn) {
        manualGenerateBtn.addEventListener('click', async () => {
            manualGenerateBtn.disabled = true;
            manualGenerateBtn.textContent = 'Generating...';
            try {
                const manuallyGenerateStatsDraft = httpsCallable(functions, 'manuallyGenerateStatsDraft');
                await manuallyGenerateStatsDraft();
                
                // Reload queue after a short delay
                setTimeout(() => {
                    loadPendingPosts(pendingQueue);
                }, 1500);
            } catch (err) {
                console.error("Generation failed", err);
                alert("Generation failed: " + err.message);
            } finally {
                manualGenerateBtn.disabled = false;
                manualGenerateBtn.textContent = 'Test Generate Stats Now';
            }
        });
    }
}

async function enablePushNotifications(statusDiv) {
    if (!statusDiv) return;

    // Only proceed if browser supports notifications
    if (!("Notification" in window)) {
        statusDiv.textContent = 'This browser does not support desktop notification.';
        statusDiv.style.color = 'red';
        return;
    }

    try {
        statusDiv.textContent = 'Requesting permission... (Check your browser pop-up)';
        statusDiv.style.color = '#d97706';

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            statusDiv.textContent = 'Permission granted. Generating token...';

            // IMPORTANT: You will need to supply your VAPID Key here from the Firebase Console!
            // Go to Project Settings -> Cloud Messaging -> Web Push Certificates, and paste the key.
            const registration = await navigator.serviceWorker.ready;
            const currentToken = await getToken(messaging, {
                vapidKey: 'BN-xKQuRg66PQt8rPOCrWyhsZ_9yagMvhwQhmoV0l4DT_lM7k-4aKzrUV49VNsgvZYbLOwK3fF3U5SkYRZsl9js',
                serviceWorkerRegistration: registration
            });

            if (currentToken && auth.currentUser) {
                // Save the token to the user's document in Firestore (supports multiple devices)
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    fcmTokens: arrayUnion(currentToken),
                    fcmTokenUpdatedAt: Timestamp.now()
                });
                statusDiv.textContent = 'Notifications enabled! You will now receive push alerts.';
                statusDiv.style.color = 'green';
            } else {
                statusDiv.textContent = 'Failed to generate token or you are not logged in.';
                statusDiv.style.color = 'red';
            }
        } else {
            statusDiv.textContent = 'Notification permission denied.';
            statusDiv.style.color = 'red';
        }
    } catch (error) {
        console.error('Error enabling notifications', error);
        statusDiv.textContent = 'Error: Make sure to replace YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE in the code!';
        statusDiv.style.color = 'red';
    }
}

async function loadTemplates(container) {
    if (!container) return;
    container.innerHTML = 'Loading templates...';
    try {
        const querySnapshot = await getDocs(collection(db, "social_templates"));
        container.innerHTML = '';
        if (querySnapshot.empty) {
            container.innerHTML = '<p>No templates created yet.</p>';
            return;
        }

        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.padding = '0';

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const li = document.createElement('li');
            li.style.background = '#f9fafb';
            li.style.padding = '10px';
            li.style.marginBottom = '10px';
            li.style.borderRadius = '6px';
            li.style.border = '1px solid #e5e7eb';

            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: ${data.isScheduled ? '#eab308' : '#000'};">${data.name}</strong> 
                        <span style="font-size: 0.85em; color: #6b7280; margin-left: 10px;">[${data.trigger}] ${data.isScheduled ? '(Scheduled)' : ''}</span>
                    </div>
                    <div>
                        <button class="btn btn-secondary btn-sm edit-template-btn" data-id="${docSnap.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-template-btn" data-id="${docSnap.id}" style="margin-left: 5px; background: #dc2626; color: white;">Delete</button>
                    </div>
                </div>
            `;

            li.querySelector('.delete-template-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to completely delete the template '${data.name}'?`)) {
                    try {
                        await deleteDoc(doc(db, "social_templates", docSnap.id));
                        loadTemplates(container);
                    } catch (e) {
                        console.error("Error deleting template", e);
                        alert("Could not delete template.");
                    }
                }
            });

            li.querySelector('.edit-template-btn').addEventListener('click', () => {
                document.getElementById('social-template-id').value = docSnap.id;
                document.getElementById('social-template-name').value = data.name;
                document.getElementById('social-template-trigger').value = data.trigger;
                document.getElementById('social-template-content').value = data.content;
                
                const format = data.format || 'text';
                const formatSel = document.getElementById('social-template-format');
                if (formatSel) {
                    formatSel.value = format;
                    document.getElementById('social-template-link-settings').style.display = format === 'link' ? 'block' : 'none';
                    document.getElementById('social-template-image-settings').style.display = format === 'image' ? 'block' : 'none';
                    document.getElementById('social-template-link-url').value = data.linkUrl || 'https://sarniaskittlesclub.com/league-tables.html';
                    document.getElementById('social-template-image-url').value = data.imageUrl || '';
                }

                const isScheduled = !!data.isScheduled;
                document.getElementById('social-template-is-scheduled').checked = isScheduled;
                document.getElementById('social-template-schedule-settings').style.display = isScheduled ? 'block' : 'none';
                
                if (isScheduled) {
                    document.getElementById('social-template-day').value = data.scheduleDay || 0;
                    document.getElementById('social-template-hour').value = data.scheduleHour || 10;
                } else {
                    document.getElementById('social-template-day').value = 0;
                    document.getElementById('social-template-hour').value = 10;
                }

                document.getElementById('template-editor-container').style.display = 'block';
                document.getElementById('create-template-btn').style.display = 'none';
            });

            list.appendChild(li);
        });
        container.appendChild(list);
    } catch (error) {
        console.error("Error loading templates", error);
        container.innerHTML = '<p class="status-error">Error loading templates.</p>';
    }
}

async function saveTemplate(editor, createBtn, listContainer) {
    const id = document.getElementById('social-template-id').value;
    const name = document.getElementById('social-template-name').value;
    const trigger = document.getElementById('social-template-trigger').value;
    const content = document.getElementById('social-template-content').value;
    
    const format = document.getElementById('social-template-format') ? document.getElementById('social-template-format').value : 'text';
    const linkUrl = document.getElementById('social-template-link-url') ? document.getElementById('social-template-link-url').value : '';
    const imageUrl = document.getElementById('social-template-image-url') ? document.getElementById('social-template-image-url').value : '';

    const isScheduled = document.getElementById('social-template-is-scheduled').checked;
    const scheduleDay = parseInt(document.getElementById('social-template-day').value, 10);
    const scheduleHour = parseInt(document.getElementById('social-template-hour').value, 10);

    if (!name || !content) {
        alert("Template Name and Content are required.");
        return;
    }

    const templateData = { 
        name, 
        trigger, 
        content,
        format,
        linkUrl: format === 'link' ? linkUrl : null,
        imageUrl: format === 'image' ? imageUrl : null,
        isScheduled,
        scheduleDay: isScheduled ? scheduleDay : null,
        scheduleHour: isScheduled ? scheduleHour : null,
        updatedAt: Timestamp.now() 
    };

    try {
        if (id) {
            await updateDoc(doc(db, "social_templates", id), templateData);
        } else {
            templateData.createdAt = Timestamp.now();
            const docRef = doc(collection(db, "social_templates"));
            await setDoc(docRef, templateData);
        }
        editor.style.display = 'none';
        createBtn.style.display = 'inline-block';
        alert("Template saved!");
        loadTemplates(listContainer);
    } catch (error) {
        console.error("Error saving template", error);
        alert("Error saving template. See console.");
    }
}

async function loadPendingPosts(container) {
    if (!container) return;
    container.innerHTML = 'Loading pending posts...';
    try {
        const q = query(collection(db, "social_pending_posts"), where('status', '==', 'pending'), orderBy('generatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        container.innerHTML = '';

        if (querySnapshot.empty) {
            container.innerHTML = '<p>No pending posts to approve.</p>';
            return;
        }

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.style.background = '#fffbeb';
            div.style.padding = '15px';
            div.style.marginBottom = '15px';
            div.style.borderRadius = '8px';
            div.style.border = '1px solid #fcd34d';

            div.innerHTML = `
                <h4>Platform: Facebook</h4>
                <p style="font-size: 0.85em; color: gray;">Generated: ${data.generatedAt.toDate().toLocaleString()}</p>
                <textarea class="form-select" style="min-height: 100px; margin-bottom: 10px;" id="pending-post-content-${docSnap.id}">${data.content}</textarea>
                <button class="btn btn-success approve-post-btn" data-id="${docSnap.id}">Approve & Publish</button>
                <button class="btn btn-secondary reject-post-btn" data-id="${docSnap.id}" style="margin-left: 10px;">Reject / Delete</button>
                <div id="post-status-${docSnap.id}" style="margin-top: 5px; font-weight: bold;"></div>
            `;

            div.querySelector('.approve-post-btn').addEventListener('click', async () => {
                await approveAndPublishPost(docSnap.id, document.getElementById(`pending-post-content-${docSnap.id}`).value);
            });

            div.querySelector('.reject-post-btn').addEventListener('click', async () => {
                const conf = confirm("Are you sure you want to reject this draft?");
                if (conf) {
                    await deleteDoc(doc(db, "social_pending_posts", docSnap.id));
                    loadPendingPosts(container);
                }
            });

            container.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading pending posts", error);
        if (error.code === 'failed-precondition') {
            container.innerHTML = '<p class="status-error">Error: Database index is currently building. Please wait a few minutes.</p>';
        } else {
            container.innerHTML = '<p class="status-error">Error loading pending posts.</p>';
        }
    }
}

async function approveAndPublishPost(id, updatedContent) {
    const statusDiv = document.getElementById(`post-status-${id}`);
    statusDiv.textContent = 'Publishing to Facebook...';
    statusDiv.style.color = '#d97706';

    try {
        // Step 1: Update the content if tweaked by admin
        await updateDoc(doc(db, "social_pending_posts", id), {
            content: updatedContent,
            status: 'approved',
            approvedAt: Timestamp.now()
        });

        // Step 2: Trigger Cloud Function to post to FB
        const publishFacebookPost = httpsCallable(functions, 'publishFacebookPost');
        const publishResult = await publishFacebookPost({ content: updatedContent, postId: id });

        if (publishResult.data.success) {
            statusDiv.textContent = 'Successfully published to Facebook!';
            statusDiv.style.color = 'green';
        } else {
            throw new Error(publishResult.data.error || 'Unknown error');
        }

        // Reload queue after short delay
        setTimeout(() => {
            loadPendingPosts(document.getElementById('social-pending-queue'));
        }, 3000);

    } catch (error) {
        console.error('Error approving post', error);
        statusDiv.textContent = 'Error publishing post.';
        statusDiv.style.color = 'red';
    }
}

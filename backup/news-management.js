import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from './firebase.config.js';

export async function initNewsManagement() {
    const newsForm = document.getElementById('news-form');
    const newsList = document.getElementById('news-list');
    const newsIdField = document.getElementById('news-id');

    async function loadNews() {
        if (!newsList) return;
        newsList.innerHTML = '<h3>Existing News</h3>';
        const q = query(collection(db, "news"), orderBy("timestamp", "desc"));
        const newsSnapshot = await getDocs(q);
        newsSnapshot.forEach(doc => {
            const newsItem = doc.data();
            const newsElement = document.createElement('div');
            newsElement.classList.add('news-item');
            newsElement.innerHTML = `
                <h3>${newsItem.title}</h3>
                <p>${newsItem.content}</p>
                <div class="news-item-actions">
                    <button class="btn btn-secondary edit-news-btn" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-danger delete-news-btn" data-id="${doc.id}">Delete</button>
                </div>
            `;
            newsList.appendChild(newsElement);
        });
    }

    newsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('news-title').value;
        const content = document.getElementById('news-content').value;
        const newsId = newsIdField.value;

        if (newsId) {
            // Update existing news
            await updateDoc(doc(db, "news", newsId), {
                title,
                content
            });
        } else {
            // Add new news
            await addDoc(collection(db, "news"), {
                title,
                content,
                timestamp: serverTimestamp()
            });
        }
        newsForm.reset();
        newsIdField.value = '';
        loadNews();
    });

    newsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-news-btn')) {
            const newsId = e.target.dataset.id;
            const newsDoc = doc(db, "news", newsId);
            const newsSnapshot = await getDoc(newsDoc);
            const newsItem = newsSnapshot.data();

            document.getElementById('news-title').value = newsItem.title;
            document.getElementById('news-content').value = newsItem.content;
            newsIdField.value = newsId;
        }

        if (e.target.classList.contains('delete-news-btn')) {
            const newsId = e.target.dataset.id;
            if (confirm("Are you sure you want to delete this news item?")) {
                await deleteDoc(doc(db, "news", newsId));
                loadNews();
            }
        }
    });

    loadNews();
}

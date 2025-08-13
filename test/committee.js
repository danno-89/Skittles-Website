import { firebaseConfig } from './firebase.config.js';

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

const db = firebase.firestore();

const committeeGrid = document.querySelector('.committee-grid');

if (committeeGrid) {
    const loadCommittee = async () => {
        try {
            const snapshot = await db.collection('committee').orderBy('order', 'asc').get();

            if (snapshot.empty) {
                committeeGrid.innerHTML = '<p>No committee members found.</p>';
                return;
            }

            committeeGrid.innerHTML = ''; // Clear the "loading" message

            snapshot.forEach(doc => {
                const member = doc.data();
                const card = document.createElement('div');
                card.className = 'member-card';

                card.innerHTML = `
                    <h3>${member.name || 'N/A'}</h3>
                    <p class="role">${member.role || 'Committee Member'}</p>
                    ${member.email ? `<p class="email"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
                `;
                committeeGrid.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading committee members:", error);
            committeeGrid.innerHTML = '<p>Error loading committee members.</p>';
        }
    };

    loadCommittee();
}

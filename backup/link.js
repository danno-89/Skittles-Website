import { auth, db } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const linkAccountForm = document.getElementById('link-account-form');
const errorMessage = document.getElementById('error-message');

onAuthStateChanged(auth, (user) => {
    if (!user) {
        // If no user is logged in, redirect to the login page.
        window.location.href = 'login.html';
    }
});

linkAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    const user = auth.currentUser;
    if (!user) {
        errorMessage.textContent = 'You must be logged in to link an account.';
        errorMessage.style.display = 'block';
        return;
    }

    const firstName = linkAccountForm['first-name'].value.trim().toLowerCase();
    const lastName = linkAccountForm['last-name'].value.trim().toLowerCase();
    const dob = linkAccountForm['dob'].value;
    const postCode = linkAccountForm['post-code'].value.trim().toLowerCase();
    const mobileNo = linkAccountForm['mobile-no'].value.trim();
    const homeNo = linkAccountForm['home-no'].value.trim();

    if (!dob && !postCode && !mobileNo && !homeNo) {
        errorMessage.textContent = 'Please provide at least one piece of verification information.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const playersRef = collection(db, 'players_private');
        let q = query(playersRef, 
            where("firstName", "==", firstName), 
            where("lastName", "==", lastName)
        );

        if (dob) q = query(q, where("dob", "==", dob));
        if (postCode) q = query(q, where("postCode", "==", postCode));
        if (mobileNo) q = query(q, where("mobileNo", "==", mobileNo));
        if (homeNo) q = query(q, where("homeNo", "==", homeNo));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            errorMessage.textContent = "We couldn't find a matching player record. Please double-check your details or contact the club secretary.";
            errorMessage.style.display = 'block';
        } else if (querySnapshot.docs.length > 1) {
            errorMessage.textContent = "Multiple records found. Please contact the club secretary for assistance.";
            errorMessage.style.display = 'block';
        } else {
            const playerDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'players_private', playerDoc.id), {
                authId: user.uid
            });

            alert('Your account has been successfully linked!');
            window.location.href = 'profile.html';
        }
    } catch (error) {
        console.error("Error linking account:", error);
        errorMessage.textContent = 'An error occurred while trying to link your account. Please try again later.';
        errorMessage.style.display = 'block';
    }
});

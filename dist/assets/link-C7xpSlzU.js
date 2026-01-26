import"./modulepreload-polyfill-B5Qt9EMX.js";import{e as h,c as b,b as p,o as L,a as S,q as B,w as v,d as P,g as M,u as T}from"./firebase.config-IpTQKhZm.js";/* empty css                    */import"./main-DLzLBIiP.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";document.addEventListener("DOMContentLoaded",()=>{const r=document.getElementById("message-container"),u=document.getElementById("results-container");let f=null;const g=new Map;async function I(){try{(await h(b(p,"teams"))).forEach(e=>g.set(e.id,e.data().name))}catch(o){console.error("Failed to fetch teams:",o)}L(S,o=>{if(o){f=o;const e=new URLSearchParams(window.location.search),t=e.get("email"),n=e.get("firstname"),i=e.get("lastname");t&&n&&i?w(t,n,i):r.textContent="Could not find user details to link. Please start again."}else window.location.href="create.html"})}async function w(o,e,t){r.textContent="Searching for your player profile...",u.innerHTML="";try{const n=b(p,"players_public"),i=B(n,v("firstName","==",e),v("lastName","==",t)),l=await h(i);if(l.empty){r.textContent="No matching player profile was found. Please check the name you registered with, or contact a committee member for assistance.";return}r.textContent="We found the following potential matches. Please select your profile to proceed with verification.",l.forEach(c=>{const s=c.data(),m=g.get(s.teamId)||"Unknown Team",a=document.createElement("div");a.className="result-item",a.innerHTML=`
                    <p><strong>Name:</strong> ${s.firstName} ${s.lastName}</p>
                    <p><strong>Team:</strong> ${m}</p>
                    <button data-player-id="${c.id}">This is me</button>
                `,u.appendChild(a)}),E()}catch(n){console.error("Error searching for player:",n),r.textContent="An error occurred while searching. Please try again."}}function E(){u.querySelectorAll("button[data-player-id]").forEach(e=>{e.addEventListener("click",t=>{const n=t.target.dataset.playerId;C(n)})})}function C(o){r.innerHTML=`
            <p>To verify your identity, please provide at least <strong>two</strong> of the following details:</p>
        `,u.innerHTML=`
            <div class="form-group">
                <label for="dob">Date of Birth (dd/mm/yyyy)</label>
                <input type="text" id="dob">
            </div>
            <div class="form-group">
                <label for="postcode">Postcode</label>
                <input type="text" id="postcode">
            </div>
            <div class="form-group">
                <label for="mobile">Mobile Number</label>
                <input type="text" id="mobile">
            </div>
             <div class="form-group">
                <label for="home">Home/Work Number</label>
                <input type="text" id="home">
            </div>
            <button id="verify-btn" data-player-id="${o}">Verify and Link Account</button>
        `,N(),y("mobile"),y("home"),x(),document.getElementById("verify-btn").addEventListener("click",$)}function D(o){if(!o||typeof o.toDate!="function")return null;const e=o.toDate(),t=String(e.getDate()).padStart(2,"0"),n=String(e.getMonth()+1).padStart(2,"0"),i=e.getFullYear();return`${t}/${n}/${i}`}async function $(o){var c;const e=o.target.dataset.playerId,t=document.getElementById("dob").value.trim(),n=document.getElementById("postcode").value.trim(),i=document.getElementById("mobile").value.trim(),l=document.getElementById("home").value.trim();try{const s=P(p,"players_private",e),m=await M(s);if(!m.exists()){r.textContent="Could not find your private player data. Please contact a committee member.";return}const a=m.data();let d=0;t&&D(a.dob)===t&&d++,n&&((c=a.address)!=null&&c.postCode)&&n.toUpperCase()===a.address.postCode.toUpperCase()&&d++,i&&a.mobileNo&&i===a.mobileNo&&d++,l&&a.homeNo&&l===a.homeNo&&d++,d>=2?(await T(s,{authId:f.uid}),r.textContent="Account linked successfully! You will be redirected to your profile.",setTimeout(()=>{window.location.href="profile.html"},3e3)):r.textContent="The verification details did not match our records. Please try again."}catch(s){console.error("Error during verification:",s),r.textContent="An error occurred during verification. Please try again."}}function N(){const o=document.getElementById("dob");o&&o.addEventListener("input",e=>{let t=e.target.value.replace(/\D/g,"");t.length>2&&(t=`${t.substring(0,2)}/${t.substring(2)}`),t.length>5&&(t=`${t.substring(0,5)}/${t.substring(5,9)}`),e.target.value=t})}function y(o){const e=document.getElementById(o);e&&e.addEventListener("input",t=>{let n=t.target.value.replace(/\D/g,"");n.length>5&&(n=`${n.substring(0,5)} ${n.substring(5,11)}`),t.target.value=n})}function x(){const o=document.getElementById("postcode");o&&o.addEventListener("input",e=>{let t=e.target.value.toUpperCase().replace(/\s/g,"");t.length>3&&(t=`${t.substring(0,3)} ${t.substring(3,6)}`),e.target.value=t.trim()})}I()});

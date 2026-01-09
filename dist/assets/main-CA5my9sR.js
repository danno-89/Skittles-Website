import{o as S,c,b as r,q as m,w as g,e as d,d as u,g as y,t as E,a as v,v as x,l as C,h as M}from"./firebase.config-IpTQKhZm.js";import{updateDoc as T}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const b=document.createElement("template");b.innerHTML=`
  <style>
    :host {
      display: block;
      --icon-size: 2rem; /* Default icon size, matches h1 */
    }
    .page-header {
      padding-block-end: 10px;
      border-block-end: 4px solid var(--club-yellow);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
        color: var(--club-green);
        margin: 0;
        padding: 0;
        font-size: 2rem;
    }
    ::slotted(popup-menu) {
        font-size: var(--icon-size);
    }
  </style>
  <div class="page-header">
    <h1><slot name="title"></slot></h1>
    <slot name="icon"></slot>
  </div>
`;class H extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(b.content.cloneNode(!0))}}customElements.define("page-header",H);const w=document.createElement("template");w.innerHTML=`
  <style>
    :host {
      display: inline-flex;
      align-items: center;
      position: relative;
    }

    .popup-trigger {
      cursor: pointer;
      background-color: transparent;
      border: none;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
    }

    .icon-container svg {
      width: 1em;
      height: 1em;
    }

    /* Style the duotone SVG paths */
    .icon-container svg path:nth-of-type(1) {
      fill: var(--club-green);
    }
    .icon-container svg path:nth-of-type(2) {
      fill: var(--club-yellow);
    }
    
    #label {
      display: none;
    }

    .popup-content {
      display: none;
      position: absolute;
      top: 100%;
      right: 0; /* Align popup to the right */
      background-color: var(--pure-white);
      border: 2px solid var(--club-green);
      border-radius: var(--border-radius);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 10;
      padding: var(--spacing-md);
    }

    .popup-content.visible {
      display: block;
    }
  </style>
  <div class="popup-trigger">
    <div class="icon-container"></div>
    <span id="label"></span>
  </div>
  <div class="popup-content">
    <slot></slot>
  </div>
`;class I extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(w.content.cloneNode(!0))}async connectedCallback(){const e=this.shadowRoot.querySelector(".icon-container"),a=this.shadowRoot.querySelector("#label"),o=this.shadowRoot.querySelector(".popup-trigger"),n=this.shadowRoot.querySelector(".popup-content"),l=this.getAttribute("icon"),s=this.getAttribute("label");if(l)try{const i=await fetch(`assets/${l}.svg`);if(!i.ok)throw new Error(`Failed to load icon: ${i.statusText}`);const L=await i.text();e.innerHTML=L}catch(i){console.error("Error loading SVG:",i),e.innerHTML="⚠️"}a.textContent=s,o.addEventListener("click",i=>{i.stopPropagation(),n.classList.toggle("visible")}),document.addEventListener("click",i=>{this.contains(i.target)||n.classList.remove("visible")})}}customElements.define("popup-menu",I);let k;const D=new Promise(t=>{k=t});async function F(t){const e=await p(t);return e?e.publicData:null}async function p(t){try{const e=c(r,"players_private"),a=m(e,g("authId","==",t)),o=await d(a);if(o.empty)return null;const n=o.docs[0],l=n.id,s=u(r,"players_public",l),i=await y(s);return i.exists()?{publicData:{publicId:l,...i.data()},privateData:n.data()}:null}catch(e){return console.error("Error fetching user profile:",e),null}}async function h(t){const e=document.getElementById("team-management-nav-link");if(e&&(e.textContent="Team Management",t)){const a=u(r,"teams",t),o=await y(a);o.exists()&&(e.textContent=o.data().name)}}document.addEventListener("htmlIncludesLoaded",()=>{S(v,async t=>{var a,o;let e=null;if(t){if(e=await p(t.uid),!e&&t.email)try{const n=c(r,"players_private"),l=m(n,g("email","==",t.email)),s=await d(l);if(!s.empty){const i=s.docs[0];i.data().authId||(await T(i.ref,{authId:t.uid}),e=await p(t.uid))}}catch(n){console.error("Error trying to link account:",n)}if((a=e==null?void 0:e.publicData)!=null&&a.committee)try{const n=u(r,"users",t.uid);await E(n,{committee:!0},{merge:!0})}catch(n){console.error("Error synchronizing committee status to 'users' collection:",n)}await h((o=e==null?void 0:e.publicData)==null?void 0:o.teamId)}else await h(null);k({user:t,publicData:e==null?void 0:e.publicData,privateData:e==null?void 0:e.privateData})})});async function R(){const t=c(r,"match_results"),e=await d(t);let a=0,o=0,n=0;const l=e.size;return e.forEach(s=>{const i=s.data();i.homeScore!=null&&i.awayScore!=null&&(o++,a+=(i.homeScore||0)+(i.awayScore||0)),i.status==="postponed"&&n++}),{pins:a,completedMatches:o,totalMatches:l,postponements:n}}const A=`<header>\r
    <div class="header-content">\r
        <h1>Sarnia Skittles Club</h1>\r
        <h2 id="page-title"></h2>\r
        <div id="user-info" class="user-info" style="display: none;">\r
            <span id="user-email-header"></span>\r
            <a href="#" id="sign-out-link">(Sign Out)</a>\r
        </div>\r
    </div>\r
    <div id="sign-in-link-container" class="user-info" style="display: none;">\r
        <a href="login.html">Sign In</a>\r
    </div>\r
    <div class="logo-container">\r
        <img src="SSC Logo.png" alt="Sarnia Skittles Club Logo">\r
    </div>\r
</header>\r
<script>\r
  const faviconLink = document.createElement('link');\r
  faviconLink.rel = 'icon';\r
  faviconLink.href = 'SSC Logo.png';\r
  faviconLink.type = 'image/png';\r
  document.head.appendChild(faviconLink);\r
<\/script>`,q=`<footer>\r
    <p>&copy; 2024 Sarnia Skittles Club. All rights reserved. | <a href="gdpr.html">GDPR & Privacy Policy</a></p>\r
</footer>\r
`,P=`<nav class="main-nav">\r
  <div class="menu-icon">\r
    <div class="bar"></div>\r
    <div class="bar"></div>\r
    <div class="bar"></div>\r
  </div>\r
  <ul>\r
    <li><a href="index.html">Home</a></li>\r
    <li><a href="players_register.html">Players Register</a></li>\r
    <div class="nav-group">\r
      <h3>2025/26 Season</h3>\r
      <li><a href="league-tables.html">League Tables</a></li>\r
      <li><a href="fixtures-results.html">Fixtures / Results</a></li>\r
      <li><a href="ssc_cup.html">SSC Cup</a></li>\r
      <li><a href="player_statistics.html">Player Statistics</a></li>\r
      <li><a href="other_competitions.html">Other Competitions</a></li>\r
    </div>\r
    <div class="nav-group">\r
      <h3>Club Information</h3>\r
      <li><a href="calendar.html">Calendar</a></li>\r
      <li><a href="committee.html">Committee</a></li>\r
      <li><a href="rules.html">Rules</a></li>\r
    </div>\r
    <div class="nav-group">\r
      <h3>Hall of Fame</h3>\r
      <li><a href="hof-league-teams.html">League Winners - Team</a></li>\r
      <li><a href="hof-league-indiv.html">League Winners - Individual</a></li>\r
      <li><a href="hof_cups.html">Cup Winners</a></li>\r
      <li><a href="hof-individual.html">Individual Knockouts</a></li>\r
      <li><a href="hof_pairs.html">Pairs Knockouts</a></li>\r
    </div>\r
    <div class="nav-group">\r
      <h3 id="skittles-hub-title" style="display: none;">Skittles Hub</h3>\r
      <li id="profile-link" style="display: none;"><a href="profile.html">My Profile</a></li>\r
      <li id="messages-link" style="display: none;"><a href="messages.html">Messages</a></li>\r
      <li id="team-management-link" style="display: none;"><a id="team-management-nav-link"\r
          href="team-management.html">Team Management</a></li>\r
      <li id="admin-link" style="display: none;"><a href="admin.html">Admin</a></li>\r
      <li id="role-manager-link" style="display: none;"><a href="roles.html">Role Manager</a></li>\r
      <li id="login-link" style="display: none;"><a href="create.html?form=login" class="button">Login</a></li>\r
      <li id="logout-link" style="display: none;"><a href="#" class="button">Sign Out</a></li>\r
  </ul>\r
</nav>`,f={"header.html":A,"footer.html":q,"navigation.html":P};async function z(){Array.from(document.querySelectorAll("[w3-include-html]")).forEach(e=>{const a=e.getAttribute("w3-include-html");f[a]?(e.innerHTML=f[a],e.removeAttribute("w3-include-html"),e.querySelectorAll("script").forEach(n=>{const l=document.createElement("script");Array.from(n.attributes).forEach(s=>l.setAttribute(s.name,s.value)),l.appendChild(document.createTextNode(n.innerHTML)),n.parentNode.replaceChild(l,n)})):(console.warn(`Template ${a} not found in bundle.`),e.innerHTML="Page not found.")}),document.dispatchEvent(new CustomEvent("htmlIncludesLoaded"))}function _(){document.querySelectorAll("#logout-link, #sign-out-btn").forEach(t=>{t.addEventListener("click",e=>{e.preventDefault(),x(v).then(()=>{alert("You have been signed out."),window.location.href="/index.html"}).catch(console.error)})})}function $(){const t=document.querySelector(".menu-icon"),e=document.querySelector(".main-nav");t&&e&&t.addEventListener("click",()=>e.classList.toggle("active"))}async function B(){const t=await R(),e=document.querySelector("header");if(e){const a=document.createElement("div");a.className="counters-container",a.innerHTML=`
            <div class="counter">
                <span class="label">Matches played:</span>
                <span class="value">${t.completedMatches} of ${t.totalMatches}</span>
            </div>
            <div class="counter">
                <span class="label">Postponements:</span>
                <span class="value">${t.postponements}</span>
            </div>
            <div class="counter">
                <span class="label">Pins:</span>
                <span class="value">${t.pins}</span>
            </div>
        `,e.appendChild(a);const o=document.createElement("style");o.textContent=`
            .counters-container {
                position: absolute;
                right: 180px; /* Adjusted from 170px */
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
                z-index: 3;
            }
            .counter {
                color: var(--club-yellow);
                font-size: 0.8rem;
                display: flex;
                gap: 5px;
                white-space: nowrap; /* Prevent text from wrapping */
            }
            
            @media (max-width: 768px) {
                .counters-container {
                    display: none;
                }
            }
        `,document.head.appendChild(o)}}async function N(){const t=document.getElementById("news-container");if(!t)return;const e=m(c(r,"news"),M("timestamp","desc"),C(5)),a=await d(e);if(a.empty){t.innerHTML="<p>No news to display.</p>";return}let o="";a.forEach(n=>{const l=n.data();o+=`
            <div class="news-item-home">
                <h4>${l.title}</h4>
                <p>${l.content}</p>
            </div>
        `}),t.innerHTML=o}document.addEventListener("htmlIncludesLoaded",()=>{_(),$(),(window.location.pathname.endsWith("/index.html")||window.location.pathname==="/")&&N(),window.location.pathname.includes("/scoreboard/")||B()});document.addEventListener("DOMContentLoaded",z);D.then(({user:t,publicData:e})=>{const a=document.getElementById("login-link"),o=document.getElementById("logout-link"),n=document.getElementById("profile-link"),l=document.getElementById("team-management-link"),s=document.getElementById("admin-link"),i=document.getElementById("skittles-hub-title");t&&e?(a&&(a.style.display="none"),o&&(o.style.display="block"),n&&(n.style.display="block"),i&&(i.style.display="block",i.textContent=`${e.firstName}'s Skittles Hub`),(e.role==="Captain"||e.role==="Vice Captain")&&l&&(l.style.display="block"),e.committee&&s&&(s.style.display="block")):(a&&(a.style.display="block"),o&&(o.style.display="none"),n&&(n.style.display="none"),l&&(l.style.display="none"),s&&(s.style.display="none"),i&&(i.style.display="none"))});export{D as a,F as g};

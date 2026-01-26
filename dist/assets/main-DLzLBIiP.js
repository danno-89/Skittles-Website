import{o as T,c as p,b as r,q as u,w as g,e as m,d as v,g as k,t as H,a as S,l as L,v as D,h as I}from"./firebase.config-IpTQKhZm.js";import{updateDoc as R}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const E=document.createElement("template");E.innerHTML=`
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
`;class q extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(E.content.cloneNode(!0))}}customElements.define("page-header",q);const x=document.createElement("template");x.innerHTML=`
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

    .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .icon-container svg {
      width: 1em;
      height: 1em;
    }

    /* Style the duotone SVG paths */
    /* Target only direct children for top-level paths to avoid matching nested group paths */
    .icon-container svg > path:nth-of-type(1) {
      fill: var(--club-green) !important;
      transition: fill 0.3s ease;
    }
    .icon-container svg > path:nth-of-type(2) {
      fill: var(--club-yellow) !important;
    }
    /* Target paths within the opacity group */
    .icon-container svg g[opacity="0.5"] path {
        fill: var(--club-yellow) !important;
    }
    
    :host(:hover) .icon-container svg path {
       /* For fill-based icons, we might want to change fill on hover? 
          Original didn't specify hover for popup-menu, but icon-component did.
          Let's try simply changing fill. */
       fill: var(--club-alternate);
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
`;class A extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(x.content.cloneNode(!0))}async connectedCallback(){const e=this.shadowRoot.querySelector(".icon-container"),a=this.shadowRoot.querySelector("#label"),i=this.shadowRoot.querySelector(".popup-trigger"),n=this.shadowRoot.querySelector(".popup-content"),l=this.getAttribute("icon"),o=this.getAttribute("label");if(l)try{const s=await fetch(`assets/${l}.svg`);if(!s.ok)throw new Error(`Failed to load icon: ${s.statusText}`);const c=await s.text();e.innerHTML=c}catch(s){console.error("Error loading SVG:",s),e.innerHTML="⚠️"}a.textContent=o,i.addEventListener("click",s=>{s.stopPropagation(),n.classList.toggle("visible")}),document.addEventListener("click",s=>{this.contains(s.target)||n.classList.remove("visible")})}}customElements.define("popup-menu",A);let C;const P=new Promise(t=>{C=t});async function V(t){const e=await y(t);return e?e.publicData:null}async function y(t){try{const e=p(r,"players_private"),a=u(e,g("authId","==",t)),i=await m(a);if(i.empty)return null;const n=i.docs[0],l=n.id,o=v(r,"players_public",l),s=await k(o);return s.exists()?{publicData:{publicId:l,...s.data()},privateData:n.data()}:null}catch(e){return console.error("Error fetching user profile:",e),null}}async function b(t){const e=document.getElementById("team-management-nav-link");if(e&&(e.textContent="Team Management",t)){const a=v(r,"teams",t),i=await k(a);i.exists()&&(e.textContent=i.data().name)}}document.addEventListener("htmlIncludesLoaded",()=>{T(S,async t=>{var a,i;let e=null;if(t){if(e=await y(t.uid),!e&&t.email)try{const n=p(r,"players_private"),l=u(n,g("email","==",t.email)),o=await m(l);if(!o.empty){const s=o.docs[0];s.data().authId||(await R(s.ref,{authId:t.uid}),e=await y(t.uid))}}catch(n){console.error("Error trying to link account:",n)}if((a=e==null?void 0:e.publicData)!=null&&a.committee)try{const n=v(r,"users",t.uid);await H(n,{committee:!0},{merge:!0})}catch(n){console.error("Error synchronizing committee status to 'users' collection:",n)}await b((i=e==null?void 0:e.publicData)==null?void 0:i.teamId)}else await b(null);C({user:t,publicData:e==null?void 0:e.publicData,privateData:e==null?void 0:e.privateData})})});async function _(){let t,e=[];try{const o=u(p(r,"seasons"),g("status","==","current"),L(1)),s=await m(o);if(s.empty){t=await m(p(r,"match_results"));const c=t.docs.map(d=>d.data()),h=[...new Set(c.map(d=>d.season).filter(Boolean))];h.sort((d,M)=>M.localeCompare(d));const f=h[0];f?e=c.filter(d=>d.season===f):e=c}else{const c=s.docs[0].id,h=u(p(r,"match_results"),g("season","==",c));t=await m(h),e=t.docs.map(f=>f.data())}}catch(o){return console.error("Error fetching statistics:",o),{pins:0,completedMatches:0,totalMatches:0,postponements:0}}let a=0,i=0,n=0;const l=e.length;return e.forEach(o=>{o.homeScore!=null&&o.awayScore!=null&&(i++,a+=(o.homeScore||0)+(o.awayScore||0)),o.status==="postponed"&&n++}),{pins:a,completedMatches:i,totalMatches:l,postponements:n}}const B=`<header>\r
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
<\/script>`,$=`<footer>\r
    <p>&copy; 2024 Sarnia Skittles Club. All rights reserved. | <a href="gdpr.html">GDPR & Privacy Policy</a></p>\r
</footer>\r
`,z=`<nav class="main-nav">\r
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
</nav>`,w={"header.html":B,"footer.html":$,"navigation.html":z};async function N(){Array.from(document.querySelectorAll("[w3-include-html]")).forEach(e=>{const a=e.getAttribute("w3-include-html");w[a]?(e.innerHTML=w[a],e.removeAttribute("w3-include-html"),e.querySelectorAll("script").forEach(n=>{const l=document.createElement("script");Array.from(n.attributes).forEach(o=>l.setAttribute(o.name,o.value)),l.appendChild(document.createTextNode(n.innerHTML)),n.parentNode.replaceChild(l,n)})):(console.warn(`Template ${a} not found in bundle.`),e.innerHTML="Page not found.")}),document.dispatchEvent(new CustomEvent("htmlIncludesLoaded"))}function O(){document.querySelectorAll("#logout-link, #sign-out-btn").forEach(t=>{t.addEventListener("click",e=>{e.preventDefault(),D(S).then(()=>{alert("You have been signed out."),window.location.href="/index.html"}).catch(console.error)})})}function F(){const t=document.querySelector(".menu-icon"),e=document.querySelector(".main-nav");t&&e&&t.addEventListener("click",()=>e.classList.toggle("active"))}async function W(){const t=await _(),e=document.querySelector("header");if(e){const a=document.createElement("div");a.className="counters-container",a.innerHTML=`
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
        `,e.appendChild(a);const i=document.createElement("style");i.textContent=`
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
        `,document.head.appendChild(i)}}async function j(){const t=document.getElementById("news-container");if(!t)return;const e=u(p(r,"news"),I("timestamp","desc"),L(5)),a=await m(e);if(a.empty){t.innerHTML="<p>No news to display.</p>";return}let i="";a.forEach(n=>{const l=n.data();i+=`
            <div class="news-item-home">
                <h4>${l.title}</h4>
                <p>${l.content}</p>
            </div>
        `}),t.innerHTML=i}document.addEventListener("htmlIncludesLoaded",()=>{O(),F(),(window.location.pathname.endsWith("/index.html")||window.location.pathname==="/")&&j(),window.location.pathname.includes("/scoreboard/")||W()});document.addEventListener("DOMContentLoaded",N);P.then(({user:t,publicData:e})=>{const a=document.getElementById("login-link"),i=document.getElementById("logout-link"),n=document.getElementById("profile-link"),l=document.getElementById("team-management-link"),o=document.getElementById("admin-link"),s=document.getElementById("skittles-hub-title");t&&e?(a&&(a.style.display="none"),i&&(i.style.display="block"),n&&(n.style.display="block"),s&&(s.style.display="block",s.textContent=`${e.firstName}'s Skittles Hub`),(e.role==="Captain"||e.role==="Vice Captain")&&l&&(l.style.display="block"),e.committee&&o&&(o.style.display="block")):(a&&(a.style.display="block"),i&&(i.style.display="none"),n&&(n.style.display="none"),l&&(l.style.display="none"),o&&(o.style.display="none"),s&&(s.style.display="none"))});export{P as a,V as g};

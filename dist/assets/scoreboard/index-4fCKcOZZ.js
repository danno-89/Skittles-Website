import"../modulepreload-polyfill-B5Qt9EMX.js";import{c as h,b as d,q as p,l as w,h as g,w as y,e as x,d as l,g as u}from"../firebase.config-IpTQKhZm.js";/* empty css                    */import"../main-CA5my9sR.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";function f(){const t=document.getElementById("scaling-content");if(!t)return;const n=t.offsetWidth,e=t.offsetHeight,a=window.innerWidth,s=window.innerHeight,i=a/n,c=s/e,o=Math.min(i,c);t.style.transform=`scale(${o})`}async function m(t){if(typeof t=="string"&&t.startsWith("Display")){const n=t.match(/\[(.*?)\]/);return n?n[1]:"TBD"}try{const n=l(d,"teams",t),e=await u(n);return e.exists()?e.data().name:"Unknown Team"}catch{return"Unknown Team"}}async function v(t){if(!t)return null;const n=l(d,"competitions",t),e=await u(n);return e.exists()?e.data().name:null}async function D(){const t=h(d,"match_results"),n=p(t,y("status","==","scheduled"),g("scheduledDate"),w(3)),e=await x(n),a=[];return e.forEach(s=>a.push({id:s.id,...s.data()})),a}async function T(){const t=await D(),n=document.querySelector(".left-buttons");if(n){n.innerHTML="";for(const e of t){const a=await m(e.homeTeamId),s=await m(e.awayTeamId),i=await v(e.division),c=new Date(e.scheduledDate.seconds*1e3).toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});let o=[i,e.round].filter(Boolean).join(" - ");const r=document.createElement("div");r.className="fixture-card",r.innerHTML=`
            <a href="game.html?matchId=${e.id}" class="card-link">
                <div class="fixture-date">${c}</div>
                ${o?`<div class="fixture-competition">${o}</div>`:""}
                <div class="fixture-teams">
                    <span class="team-name">${a}</span>
                    <span class="vs">v</span>
                    <span class="team-name">${s}</span>
                </div>
            </a>
        `,n.appendChild(r)}f()}}window.addEventListener("resize",f);document.addEventListener("DOMContentLoaded",T);

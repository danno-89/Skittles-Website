import"./modulepreload-polyfill-B5Qt9EMX.js";import{o as Q,a as _,d as j,g as q,q as w,c as h,b as l,w as d,e as m}from"./firebase.config-IpTQKhZm.js";/* empty css                              *//* empty css             */import{g as B}from"./main-DLzLBIiP.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const F=document.getElementById("team-management-container"),v=document.getElementById("fixtures-content"),M=document.getElementById("results-content");Q(_,async e=>{if(e){const a=await B(e.uid);a?(O(),k(a)):document.body.innerHTML="<p>Your player profile could not be found.</p>"}else window.location.href="create.html?form=login"});function O(){const e=document.querySelectorAll(".tabs-header .tab-link"),a=document.querySelectorAll("#tab-content-container .tab-pane");e.forEach(o=>{o.addEventListener("click",()=>{const r=o.dataset.tab;e.forEach(c=>c.classList.remove("active")),o.classList.add("active"),a.forEach(c=>{c.classList.remove("active"),c.id===`${r}-content`&&c.classList.add("active")})})})}function x(e){if(typeof e=="string"&&e.startsWith("Display[")){const a=e.indexOf("[")+1,o=e.indexOf("]");if(a>0&&o>a)return`<strong class="highlight-yellow">${e.substring(a,o)}</strong>`}return e}function H(e,a){return typeof a=="string"&&a.startsWith("Display[")?a:e.get(a)||"Unknown Team"}const D=e=>{if(!e||!e.toDate)return"N/A";const a=e.toDate(),o=a.getDate(),r=a.getFullYear(),i=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][a.getMonth()];return`${o} ${i} ${r}`};async function Y(e){if(v)try{const a=w(h(l,"seasons"),d("status","==","current")),o=await m(a);if(o.empty){v.innerHTML="<p>Could not determine the current season.</p>";return}const r=o.docs[0].data().name||o.docs[0].id,c=await m(h(l,"teams")),i=new Map;c.forEach(t=>i.set(t.id,t.data().name));const f=await m(h(l,"competitions")),u=new Map;f.forEach(t=>u.set(t.id,t.data().name));const b=w(h(l,"match_results"),d("season","==",r),d("homeTeamId","==",e)),$=w(h(l,"match_results"),d("season","==",r),d("awayTeamId","==",e)),[S,L]=await Promise.all([m(b),m($)]);let g=[];S.forEach(t=>g.push({id:t.id,...t.data()})),L.forEach(t=>g.push({id:t.id,...t.data()}));const s=g.filter(t=>t.scheduledDate&&typeof t.scheduledDate.toDate=="function"&&(!t.homeScore||!t.awayScore));if(s.sort((t,y)=>t.scheduledDate.toDate()-y.scheduledDate.toDate()),s.length===0){v.innerHTML="<p>No fixtures found for the current season.</p>";return}let n=null;const p=s.map(t=>{const y=t.scheduledDate.toDate(),E=D(t.scheduledDate),P=y.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:"Europe/London"}),C=x(H(i,t.homeTeamId)),A=t.awayTeamId||t.awayTeamis,I=x(H(i,A)),N=u.get(t.division)||t.division,T=t.round||"",R=E===n?"":E;return E!==n&&(n=E),`
                <tr>
                    <td>${R}</td>
                    <td>${P}</td>
                    <td class="${t.homeTeamId===e?"highlight-green":""}">${C}</td>
                    <td class="centered-cell">vs</td>
                    <td class="${t.awayTeamId===e?"highlight-green":""}">${I}</td>
                    <td>${N}</td>
                    <td>${T}</td>
                </tr>
            `}).join("");v.innerHTML=`
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Home</th>
                            <th></th>
                            <th>Away</th>
                            <th>Competition</th>
                            <th>Round</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p}
                    </tbody>
                </table>
            </div>
        `}catch(a){console.error("Error loading team fixtures:",a),v.innerHTML="<p>An error occurred while loading team fixtures.</p>"}}async function G(e){if(M)try{const a=w(h(l,"seasons"),d("status","==","current")),o=await m(a);if(o.empty){M.innerHTML="<p>Could not determine the current season.</p>";return}const r=o.docs[0].data().name||o.docs[0].id,c=await m(h(l,"teams")),i=new Map;c.forEach(t=>i.set(t.id,t.data().name));const f=await m(h(l,"competitions")),u=new Map;f.forEach(t=>u.set(t.id,t.data().name));const b=w(h(l,"match_results"),d("season","==",r),d("homeTeamId","==",e)),$=w(h(l,"match_results"),d("season","==",r),d("awayTeamId","==",e)),[S,L]=await Promise.all([m(b),m($)]);let g=[];S.forEach(t=>g.push({id:t.id,...t.data()})),L.forEach(t=>g.push({id:t.id,...t.data()}));const s=g.filter(t=>t.scheduledDate&&typeof t.scheduledDate.toDate=="function"&&t.homeScore&&t.awayScore);if(s.sort((t,y)=>y.scheduledDate.toDate()-t.scheduledDate.toDate()),s.length===0){M.innerHTML="<p>No results found for the current season.</p>";return}let n=null;const p=s.map(t=>{const y=D(t.scheduledDate),E=x(H(i,t.homeTeamId)),P=t.awayTeamId||t.awayTeamis,C=x(H(i,P)),A=u.get(t.division)||t.division,I=t.round||"",N=y===n?"":y;y!==n&&(n=y);let T='<span class="result-indicator draw"></span>';return t.homeTeamId===e?t.homeScore>t.awayScore?T='<span class="result-indicator win"></span>':t.homeScore<t.awayScore&&(T='<span class="result-indicator loss"></span>'):t.awayScore>t.homeScore?T='<span class="result-indicator win"></span>':t.awayScore<t.homeScore&&(T='<span class="result-indicator loss"></span>'),`
                <tr>
                    <td>${T}</td>
                    <td>${N}</td>
                    <td class="team-name ${t.homeTeamId===e?"highlight-green":""}">${E}</td>
                    <td class="score-cell">${t.homeScore} - ${t.awayScore}</td>
                    <td class="team-name ${t.awayTeamId===e?"highlight-green":""}">${C}</td>
                    <td>${A}</td>
                    <td>${I}</td>
                    <td><a href="match_details.html?matchId=${t.id}&from=team-management" class="btn-details">View Details</a></td>
                </tr>
            `}).join("");M.innerHTML=`
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>Home</th>
                            <th>Score</th>
                            <th>Away</th>
                            <th>Competition</th>
                            <th>Round</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p}
                    </tbody>
                </table>
            </div>
        `}catch(a){console.error("Error loading team results:",a),M.innerHTML="<p>An error occurred while loading team results.</p>"}}async function J(e){if(F){F.innerHTML="<p>Loading roster...</p>";try{const a=w(h(l,"players_public"),d("teamId","==",e));let r=(await m(a)).docs.map(s=>s.data());const c=await V(e),i=new Date;r=r.map(s=>{const n=s.registerExpiry?Math.ceil((s.registerExpiry.toDate()-i)/864e5):null;let p="";const t=s.registerExpiry&&c.some(y=>y.scheduledDate.toDate()<s.registerExpiry.toDate());return!s.recentFixture&&s.registerDate&&s.registerDate.toDate()>new Date(new Date().setDate(i.getDate()-30))?p="player-new":n!==null&&n<=30&&(p="player-expiring-soon"),!t&&s.registerExpiry&&(n<=30?p="player-no-fixtures-danger":p="player-no-fixtures-warn"),{...s,daysLeft:n,highlightClass:p}});const f=r.filter(s=>!s.registerExpiry||s.registerExpiry.toDate()>=i),u=r.filter(s=>s.registerExpiry&&s.registerExpiry.toDate()<i),b={Captain:1,"Vice Captain":2,Player:3},$=s=>s.sort((n,p)=>(b[n.role]||4)-(b[p.role]||4));$(f),$(u);const S=s=>s.length===0?"<h3>Active Players</h3><p>No active players found.</p>":`
                <h3>Active Players</h3>
                <div class="table-container">
                    <table class="player-roster-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Role</th>
                                <th>Reg. Date</th>
                                <th>Last Game</th>
                                <th>Expiry</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${s.map(n=>`
                                <tr class="${n.highlightClass}">
                                    <td>${n.firstName} ${n.lastName}</td>
                                    <td>${n.role!=="Player"?n.role:""}</td>
                                    <td>${D(n.registerDate)}</td>
                                    <td>${D(n.recentFixture)}</td>
                                    <td>${D(n.registerExpiry)}</td>
                                    <td>${n.daysLeft!==null?n.daysLeft:"N/A"}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `,L=s=>s.length===0?"":`
                <h3>Expired Players</h3>
                <div class="table-container">
                    <table class="player-roster-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Role</th>
                                <th>Reg. Date</th>
                                <th>Last Game</th>
                                <th>Expiry</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${s.map(n=>`
                                <tr>
                                    <td>${n.firstName} ${n.lastName}</td>
                                    <td>${n.role!=="Player"?n.role:""}</td>
                                    <td>${D(n.registerDate)}</td>
                                    <td>${D(n.recentFixture)}</td>
                                    <td>${D(n.registerExpiry)}</td>
                                    <td>Expired</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;let g=S(f);g+=L(u),F.innerHTML=g}catch(a){console.error("Error loading team players:",a),F.innerHTML="<p>An error occurred while loading the player roster.</p>"}}}async function V(e){const a=[],o=new Date,r=w(h(l,"match_results"),d("homeTeamId","==",e),d("scheduledDate",">=",o)),c=w(h(l,"match_results"),d("awayTeamId","==",e),d("scheduledDate",">=",o)),[i,f]=await Promise.all([m(r),m(c)]);return i.forEach(u=>a.push(u.data())),f.forEach(u=>a.push(u.data())),a}async function k(e){if(!e){document.body.innerHTML="<p>Your player profile could not be found.</p>";return}const{role:a,teamId:o}=e;if(a!=="Captain"&&a!=="Vice Captain"){document.body.innerHTML="<p>You do not have permission to view this page.</p>";return}if(!o){F.innerHTML="<p>You are not currently assigned to a team.</p>";return}const r=j(l,"teams",o),c=await q(r);if(c.exists()){const i=document.querySelector('page-header span[slot="title"]');i&&(i.textContent=c.data().name||"Team Management")}J(o),Y(o),G(o)}

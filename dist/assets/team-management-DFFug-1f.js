import"./modulepreload-polyfill-B5Qt9EMX.js";import{o as Q,a as _,d as j,g as q,q as w,c as h,b as l,w as d,e as m}from"./firebase.config-IpTQKhZm.js";/* empty css                              *//* empty css             */import{g as B}from"./main-CA5my9sR.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const F=document.getElementById("team-management-container"),v=document.getElementById("fixtures-content"),M=document.getElementById("results-content");Q(_,async e=>{if(e){const a=await B(e.uid);a?(O(),k(a)):document.body.innerHTML="<p>Your player profile could not be found.</p>"}else window.location.href="create.html?form=login"});function O(){const e=document.querySelectorAll(".tabs-header .tab-link"),a=document.querySelectorAll("#tab-content-container .tab-pane");e.forEach(n=>{n.addEventListener("click",()=>{const r=n.dataset.tab;e.forEach(i=>i.classList.remove("active")),n.classList.add("active"),a.forEach(i=>{i.classList.remove("active"),i.id===`${r}-content`&&i.classList.add("active")})})})}function x(e){if(typeof e=="string"&&e.startsWith("Display[")){const a=e.indexOf("[")+1,n=e.indexOf("]");if(a>0&&n>a)return`<strong class="highlight-yellow">${e.substring(a,n)}</strong>`}return e}function H(e,a){return typeof a=="string"&&a.startsWith("Display[")?a:e.get(a)||"Unknown Team"}const D=e=>{if(!e||!e.toDate)return"N/A";const a=e.toDate(),n=a.getDate(),r=a.getFullYear(),c=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][a.getMonth()];return`${n} ${c} ${r}`};async function Y(e){if(v)try{const a=w(h(l,"seasons"),d("status","==","current")),n=await m(a);if(n.empty){v.innerHTML="<p>Could not determine the current season.</p>";return}const r=n.docs[0].data().name||n.docs[0].id,i=await m(h(l,"teams")),c=new Map;i.forEach(t=>c.set(t.id,t.data().name));const f=await m(h(l,"competitions")),u=new Map;f.forEach(t=>u.set(t.id,t.data().name));const b=w(h(l,"match_results"),d("season","==",r),d("homeTeamId","==",e)),$=w(h(l,"match_results"),d("season","==",r),d("awayTeamId","==",e)),[S,L]=await Promise.all([m(b),m($)]);let g=[];S.forEach(t=>g.push({id:t.id,...t.data()})),L.forEach(t=>g.push({id:t.id,...t.data()}));const s=g.filter(t=>t.scheduledDate&&typeof t.scheduledDate.toDate=="function"&&(!t.homeScore||!t.awayScore));if(s.sort((t,y)=>t.scheduledDate.toDate()-y.scheduledDate.toDate()),s.length===0){v.innerHTML="<p>No fixtures found for the current season.</p>";return}let o=null;const p=s.map(t=>{const y=t.scheduledDate.toDate(),E=D(t.scheduledDate),P=y.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:"Europe/London"}),C=x(H(c,t.homeTeamId)),A=t.awayTeamId||t.awayTeamis,I=x(H(c,A)),N=u.get(t.division)||t.division,T=t.round||"",R=E===o?"":E;return E!==o&&(o=E),`
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
        `}catch(a){console.error("Error loading team fixtures:",a),v.innerHTML="<p>An error occurred while loading team fixtures.</p>"}}async function G(e){if(M)try{const a=w(h(l,"seasons"),d("status","==","current")),n=await m(a);if(n.empty){M.innerHTML="<p>Could not determine the current season.</p>";return}const r=n.docs[0].data().name||n.docs[0].id,i=await m(h(l,"teams")),c=new Map;i.forEach(t=>c.set(t.id,t.data().name));const f=await m(h(l,"competitions")),u=new Map;f.forEach(t=>u.set(t.id,t.data().name));const b=w(h(l,"match_results"),d("season","==",r),d("homeTeamId","==",e)),$=w(h(l,"match_results"),d("season","==",r),d("awayTeamId","==",e)),[S,L]=await Promise.all([m(b),m($)]);let g=[];S.forEach(t=>g.push({id:t.id,...t.data()})),L.forEach(t=>g.push({id:t.id,...t.data()}));const s=g.filter(t=>t.scheduledDate&&typeof t.scheduledDate.toDate=="function"&&t.homeScore&&t.awayScore);if(s.sort((t,y)=>y.scheduledDate.toDate()-t.scheduledDate.toDate()),s.length===0){M.innerHTML="<p>No results found for the current season.</p>";return}let o=null;const p=s.map(t=>{const y=D(t.scheduledDate),E=x(H(c,t.homeTeamId)),P=t.awayTeamId||t.awayTeamis,C=x(H(c,P)),A=u.get(t.division)||t.division,I=t.round||"",N=y===o?"":y;y!==o&&(o=y);let T='<span class="result-indicator draw"></span>';return t.homeTeamId===e?t.homeScore>t.awayScore?T='<span class="result-indicator win"></span>':t.homeScore<t.awayScore&&(T='<span class="result-indicator loss"></span>'):t.awayScore>t.homeScore?T='<span class="result-indicator win"></span>':t.awayScore<t.homeScore&&(T='<span class="result-indicator loss"></span>'),`
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
        `}catch(a){console.error("Error loading team results:",a),M.innerHTML="<p>An error occurred while loading team results.</p>"}}async function J(e){if(F){F.innerHTML="<p>Loading roster...</p>";try{const a=w(h(l,"players_public"),d("teamId","==",e));let r=(await m(a)).docs.map(s=>s.data());const i=await V(e),c=new Date;r=r.map(s=>{const o=s.registerExpiry?Math.ceil((s.registerExpiry.toDate()-c)/864e5):null;let p="";const t=s.registerExpiry&&i.some(y=>y.scheduledDate.toDate()<s.registerExpiry.toDate());return!s.recentFixture&&s.registerDate&&s.registerDate.toDate()>new Date(new Date().setDate(c.getDate()-30))?p="player-new":o!==null&&o<=30&&(p="player-expiring-soon"),!t&&s.registerExpiry&&(o<=30?p="player-no-fixtures-danger":p="player-no-fixtures-warn"),{...s,daysLeft:o,highlightClass:p}});const f=r.filter(s=>!s.registerExpiry||s.registerExpiry.toDate()>=c),u=r.filter(s=>s.registerExpiry&&s.registerExpiry.toDate()<c),b={Captain:1,"Vice Captain":2,Player:3},$=s=>s.sort((o,p)=>(b[o.role]||4)-(b[p.role]||4));$(f),$(u);const S=s=>s.length===0?"<h3>Active Players</h3><p>No active players found.</p>":`
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
                            ${s.map(o=>`
                                <tr class="${o.highlightClass}">
                                    <td>${o.firstName} ${o.lastName}</td>
                                    <td>${o.role!=="Player"?o.role:""}</td>
                                    <td>${D(o.registerDate)}</td>
                                    <td>${D(o.recentFixture)}</td>
                                    <td>${D(o.registerExpiry)}</td>
                                    <td>${o.daysLeft!==null?o.daysLeft:"N/A"}</td>
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
                            ${s.map(o=>`
                                <tr>
                                    <td>${o.firstName} ${o.lastName}</td>
                                    <td>${o.role!=="Player"?o.role:""}</td>
                                    <td>${D(o.registerDate)}</td>
                                    <td>${D(o.recentFixture)}</td>
                                    <td>${D(o.registerExpiry)}</td>
                                    <td>Expired</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;let g=S(f);g+=L(u),F.innerHTML=g}catch(a){console.error("Error loading team players:",a),F.innerHTML="<p>An error occurred while loading the player roster.</p>"}}}async function V(e){const a=[],n=new Date,r=w(h(l,"match_results"),d("homeTeamId","==",e),d("scheduledDate",">=",n)),i=w(h(l,"match_results"),d("awayTeamId","==",e),d("scheduledDate",">=",n)),[c,f]=await Promise.all([m(r),m(i)]);return c.forEach(u=>a.push(u.data())),f.forEach(u=>a.push(u.data())),a}async function k(e){if(!e){document.body.innerHTML="<p>Your player profile could not be found.</p>";return}const{role:a,teamId:n}=e;if(a!=="Captain"&&a!=="Vice Captain"){document.body.innerHTML="<p>You do not have permission to view this page.</p>";return}if(!n){F.innerHTML="<p>You are not currently assigned to a team.</p>";return}const r=j(l,"teams",n),i=await q(r);i.exists()&&(document.querySelector(".page-header h1").textContent=i.data().name||"Team Management"),J(n),Y(n),G(n)}

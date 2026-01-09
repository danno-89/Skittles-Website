import"./modulepreload-polyfill-B5Qt9EMX.js";import{e as T,c as S,b as $,q as _,w as j,l as Q,h as V}from"./firebase.config-IpTQKhZm.js";/* empty css                              *//* empty css             */import"./main-CA5my9sR.js";import"./icon-component-rmBoP_Yk.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const k=new Map,D=new Map;let g=[],p="fixtures";function K(e){const a=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],n=new Date(e),o=n.getDate(),t=a[n.getMonth()],s=n.getFullYear();return`${o} ${t} ${s}`}function A(e){var a;if(typeof e=="string"&&e.startsWith("Display[")){const n=e.indexOf("[")+1,o=e.indexOf("]");return`<strong>${e.substring(n,o)}</strong>`}return((a=D.get(e))==null?void 0:a.name)||"Unknown Team"}function Y(e){if(!e||!(e instanceof Date))return new Date;const a=new Date(e),n=a.getDay(),o=a.getDate()-n+(n===0?-6:1),t=new Date(a.setDate(o));return t.setHours(0,0,0,0),t}async function X(){try{(await T(S($,"competitions"))).forEach(a=>k.set(a.id,a.data()))}catch(e){console.error("Error populating competition cache:",e)}}async function tt(){try{(await T(S($,"teams"))).forEach(a=>D.set(a.id,a.data()))}catch(e){console.error("Error populating team cache:",e)}}async function et(e){try{const a=_(S($,"match_results"),j("season","==",e),V("scheduledDate","asc"));g=(await T(a)).docs.map(o=>{var s;const t=o.data();return t.scheduledDate=(s=t.scheduledDate)==null?void 0:s.toDate(),{id:o.id,...t}})}catch(a){console.error("Error fetching fixtures for season:",a),g=[]}}function st(e){const a=[],n=new Map;e.forEach(t=>{if(t.status!=="spare"&&t.scheduledDate){const s=t.scheduledDate.toISOString().split("T")[0];n.has(s)||n.set(s,[]),n.get(s).push(t)}});const o=["19:00","20:00","21:00"];return n.forEach((t,s)=>{const l=new Set(t.map(r=>r.scheduledDate.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/London"}).substring(0,5)));o.forEach(r=>{if(!l.has(r)){const[E,v]=r.split(":"),[d,i,y]=s.split("-").map(Number),m=new Date(Date.UTC(d,i-1,y,parseInt(E,10),parseInt(v,10)));m>new Date&&a.push({id:`spare-${s}-${r}`,scheduledDate:m,status:"spare"})}})}),a}function N(e,a){var v;const n=document.getElementById(a);if(!n)return;if(e.length===0){n.innerHTML="<p>No matches found for this category.</p>";return}const o=p==="fixtures",t=p==="results",s=p==="postponed",l=e.reduce((d,i)=>{if(!i.scheduledDate)return d;const y=Y(i.scheduledDate),m=y.toISOString().split("T")[0];return d[m]||(d[m]={startDate:y,matches:[]}),d[m].matches.push(i),d},{});let r="";const E=Object.keys(l).sort();t&&E.reverse();for(const d of E){const i=l[d];i.matches.sort((c,h)=>c.scheduledDate-h.scheduledDate);const y=K(i.startDate),m=i.matches.filter(c=>c.status!=="rescheduled"&&c.status!=="spare"),U=m.length>0&&m.every(c=>{var f;const h=((f=k.get(c.division))==null?void 0:f.name)||"";return h!=="Premier Division"&&h!=="First Division"})?"week-header cup-week-header":"week-header";let F;o?F=`
                <thead class="sticky-header">
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="time-col">Time</th>
                        <th class="home-team-col">Home Team</th>
                        <th class="away-team-col">Away Team</th>
                        <th class="competition-col">Competition</th>
                        <th class="round-col">Round</th>
                        <th class="status-cell">Status</th>
                    </tr>
                </thead>`:F=`
                <thead class="sticky-header">
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="time-col">Time</th>
                        <th class="home-team-col">Home Team</th>
                        <th class="away-team-col">Away Team</th>
                        ${s?"":'<th class="score">Score</th>'}
                        ${s?"":`<th class="status-cell">${t?"":"Status"}</th>`}
                        <th class="competition-col">Competition</th>
                        <th class="round-col">Round</th>
                        ${s?'<th class="postponed-by-col">Postponed by</th>':""}
                    </tr>
                </thead>`;let w="<tbody>",x=null;for(const c of i.matches){const h=c.scheduledDate,f=K(h),b=h.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:"Europe/London"}),I=f===x?"":f;if(f!==x&&(x=f),c.status==="spare")w+=`
                    <tr class="status-spare">
                        <td class="date-col">${I}</td>
                        <td class="time-col">${b}</td>
                        <td colspan="5">Spare slot for Postponed Fixtures</td>
                    </tr>`;else{const O=c.awayTeamId||c.awayTeamis,B=A(c.homeTeamId),C=A(O),L=((v=k.get(c.division))==null?void 0:v.name)||"N/A",M=c.round||"";if(s){const u=A(c.postponedBy);w+=`
                        <tr class="status-postponed">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${B}</td>
                            <td class="away-team-col">${C}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                            <td class="postponed-by-col">${u}</td>
                        </tr>`}else if(o){let u=c.status||"scheduled",H=u==="scheduled"?"<span></span>":`<span>${u}</span>`;w+=`
                        <tr class="status-${u}">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${B}</td>
                            <td class="away-team-col">${C}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                            <td class="status-cell">${H}</td>
                        </tr>`}else{const u=c.homeScore!=null&&c.awayScore!=null,H=u?`${c.homeScore} - ${c.awayScore}`:"-";let P=B,W=C,Z=c.status||(u?"completed":"scheduled"),z=`<a href="match_details.html?matchId=${c.id}&from=fixtures" class="details-link"><icon-component name="notebook"></icon-component></a>`;if(u){const R=parseInt(c.homeScore,10),J=parseInt(c.awayScore,10);R>J?P=`<span class="winner">${B}</span>`:J>R&&(W=`<span class="winner">${C}</span>`)}w+=`
                        <tr class="status-${Z}">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${P}</td>
                            <td class="away-team-col">${W}</td>
                            <td class="score">${H}</td>
                            <td class="status-cell">${z}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                        </tr>`}}}w+="</tbody>",r+=`
            <details class="week-details" open>
                <summary class="${U}">Week Commencing: ${y}</summary>
                <div class="table-container">
                    <table class="results-table">
                        ${F}
                        ${w}
                    </table>
                </div>
            </details>`}n.innerHTML=r}async function q(){const e=document.getElementById("team-filter").value,a=document.getElementById("competition-filter").value,n=e||a;let o=g.filter(t=>{const s=t.awayTeamId||t.awayTeamis,l=!e||t.homeTeamId===e||s===e,r=!a||t.division===a;return l&&r});if(p==="fixtures"){let s=[...o.filter(l=>(!l.status||l.status==="scheduled"||l.status==="rescheduled")&&l.homeScore==null)];if(!n){const l=st(g);s.push(...l)}N(s,"fixtures-container")}else if(p==="results"){let t=o.filter(s=>s.status==="completed"||s.homeScore!=null&&s.awayScore!=null&&s.status!=="postponed");N(t,"results-container")}else if(p==="postponed"){let t=o.filter(s=>s.status==="postponed");N(t,"postponements-container")}}function at(){const e=document.getElementById("team-filter").value,a=document.getElementById("competition-filter").value,n=[...new Set(g.map(t=>t.division))];ot(n);const o=new Set;g.forEach(t=>{D.has(t.homeTeamId)&&o.add(t.homeTeamId);const s=t.awayTeamId||t.awayTeamis;D.has(s)&&o.add(s)}),nt([...o]),document.getElementById("competition-filter").value=a,document.getElementById("team-filter").value=e}function ot(e){const a=document.getElementById("competition-filter");a.innerHTML='<option value="">All Competitions</option>',e.forEach(n=>{const o=k.get(n);if(o&&o.fixtures===!0){const t=document.createElement("option");t.value=n,t.textContent=o.name,a.appendChild(t)}})}function nt(e){const a=document.getElementById("team-filter");a.innerHTML='<option value="">All Teams</option>',e.map(o=>{var t;return{id:o,name:(t=D.get(o))==null?void 0:t.name}}).filter(o=>o.name).sort((o,t)=>o.name.localeCompare(t.name)).forEach(o=>{const t=document.createElement("option");t.value=o.id,t.textContent=o.name,a.appendChild(t)})}async function ct(){const e=document.getElementById("season-filter");let a=null;try{const t=_(S($,"seasons"),j("status","==","current"),Q(1)),s=await T(t);s.empty||(a=s.docs[0].id)}catch(t){console.error("Error fetching current season:",t)}const n=await T(S($,"match_results")),o=[...new Set(n.docs.map(t=>t.data().season).filter(Boolean))].sort((t,s)=>s.localeCompare(t));e.innerHTML="",!a&&o.length>0&&(a=o[0]),o.forEach(t=>{const s=document.createElement("option");s.value=t,s.textContent=t,t===a&&(s.selected=!0),e.appendChild(s)}),await G()}async function G(){const e=document.getElementById("season-filter").value;e&&(document.getElementById("fixtures-container").innerHTML="<p>Loading fixtures...</p>",document.getElementById("results-container").innerHTML="",document.getElementById("postponements-container").innerHTML="",await et(e),at(),q())}function lt(){const e=document.getElementById("filter-modal"),a=document.getElementById("filter-modal-btn"),n=document.querySelector(".modal .close-btn"),o=document.getElementById("apply-filters-btn");a.onclick=()=>e.style.display="block",n.onclick=()=>e.style.display="none",window.onclick=t=>{t.target==e&&(e.style.display="none")},o.onclick=()=>{q(),e.style.display="none"},document.querySelector(".tab-bar").addEventListener("click",t=>{t.target.matches(".tab-link")&&(p=t.target.dataset.tab,document.querySelectorAll(".tab-link").forEach(s=>s.classList.remove("active")),document.querySelectorAll(".tab-pane").forEach(s=>s.classList.remove("active")),t.target.classList.add("active"),document.getElementById(p).classList.add("active"),q())}),document.getElementById("season-filter").addEventListener("change",G)}async function rt(){await Promise.all([X(),tt()]),await ct(),lt()}rt();

import"./modulepreload-polyfill-B5Qt9EMX.js";import{e as T,c as S,b as $,q as _,w as j,l as Q,h as V}from"./firebase.config-IpTQKhZm.js";/* empty css                              *//* empty css             */import"./main-DLzLBIiP.js";import"./icon-component-BNGfFzw0.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const F=new Map,D=new Map;let g=[],p="fixtures";function K(e){const s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],n=new Date(e),o=n.getDate(),t=s[n.getMonth()],a=n.getFullYear();return`${o} ${t} ${a}`}function A(e){var s;if(typeof e=="string"&&e.startsWith("Display[")){const n=e.indexOf("[")+1,o=e.indexOf("]");return`<strong>${e.substring(n,o)}</strong>`}return((s=D.get(e))==null?void 0:s.name)||"Unknown Team"}function Y(e){if(!e||!(e instanceof Date))return new Date;const s=new Date(e),n=s.getDay(),o=s.getDate()-n+(n===0?-6:1),t=new Date(s.setDate(o));return t.setHours(0,0,0,0),t}async function X(){try{(await T(S($,"competitions"))).forEach(s=>F.set(s.id,s.data()))}catch(e){console.error("Error populating competition cache:",e)}}async function tt(){try{(await T(S($,"teams"))).forEach(s=>D.set(s.id,s.data()))}catch(e){console.error("Error populating team cache:",e)}}async function et(e){try{const s=_(S($,"match_results"),j("season","==",e),V("scheduledDate","asc"));g=(await T(s)).docs.map(o=>{var a;const t=o.data();return t.scheduledDate=(a=t.scheduledDate)==null?void 0:a.toDate(),{id:o.id,...t}})}catch(s){console.error("Error fetching fixtures for season:",s),g=[]}}function st(e){const s=[],n=new Map;e.forEach(t=>{if(t.status!=="spare"&&t.scheduledDate){const a=t.scheduledDate.toISOString().split("T")[0];n.has(a)||n.set(a,[]),n.get(a).push(t)}});const o=["19:00","20:00","21:00"];return n.forEach((t,a)=>{const l=new Set(t.map(r=>r.scheduledDate.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/London"}).substring(0,5)));o.forEach(r=>{if(!l.has(r)){const[v,E]=r.split(":"),[d,i,y]=a.split("-").map(Number),u=new Date(Date.UTC(d,i-1,y,parseInt(v,10),parseInt(E,10)));u>new Date&&s.push({id:`spare-${a}-${r}`,scheduledDate:u,status:"spare"})}})}),s}function q(e,s){var E;const n=document.getElementById(s);if(!n)return;if(e.length===0){n.innerHTML="<p>No matches found for this category.</p>";return}const o=p==="fixtures",t=p==="results",a=p==="postponed",l=e.reduce((d,i)=>{if(!i.scheduledDate)return d;const y=Y(i.scheduledDate),u=y.toISOString().split("T")[0];return d[u]||(d[u]={startDate:y,matches:[]}),d[u].matches.push(i),d},{});let r="";const v=Object.keys(l).sort();t&&v.reverse();for(const d of v){const i=l[d];i.matches.sort((c,h)=>c.scheduledDate-h.scheduledDate);const y=K(i.startDate),u=i.matches.filter(c=>c.status!=="rescheduled"&&c.status!=="spare"),U=u.length>0&&u.every(c=>{var f;const h=((f=F.get(c.division))==null?void 0:f.name)||"";return h!=="Premier Division"&&h!=="First Division"})?"week-header cup-week-header":"week-header";let k;o?k=`
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
                </thead>`:k=`
                <thead class="sticky-header">
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="time-col">Time</th>
                        <th class="home-team-col">Home Team</th>
                        <th class="away-team-col">Away Team</th>
                        ${a?"":'<th class="score">Score</th>'}
                        ${a?"":`<th class="status-cell">${t?"":"Status"}</th>`}
                        <th class="competition-col">Competition</th>
                        <th class="round-col">Round</th>
                        ${a?'<th class="postponed-by-col">Postponed by</th>':""}
                    </tr>
                </thead>`;let w="<tbody>",x=null;for(const c of i.matches){const h=c.scheduledDate,f=K(h),b=h.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0,timeZone:"Europe/London"}),I=f===x?"":f;if(f!==x&&(x=f),c.status==="spare")w+=`
                    <tr class="status-spare">
                        <td class="date-col">${I}</td>
                        <td class="time-col">${b}</td>
                        <td colspan="5">Spare slot for Postponed Fixtures</td>
                    </tr>`;else{const O=c.awayTeamId||c.awayTeamis,C=A(c.homeTeamId),B=A(O),L=((E=F.get(c.division))==null?void 0:E.name)||"N/A",M=c.round||"";if(a){const m=A(c.postponedBy);w+=`
                        <tr class="status-postponed">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${C}</td>
                            <td class="away-team-col">${B}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                            <td class="postponed-by-col">${m}</td>
                        </tr>`}else if(o){let m=c.status||"scheduled",H=m==="scheduled"?"<span></span>":`<span>${m}</span>`;w+=`
                        <tr class="status-${m}">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${C}</td>
                            <td class="away-team-col">${B}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                            <td class="status-cell">${H}</td>
                        </tr>`}else{const m=c.homeScore!=null&&c.awayScore!=null,H=m?`${c.homeScore} - ${c.awayScore}`:"-";let P=C,R=B,Z=c.status||(m?"completed":"scheduled"),z=`<a href="match_details.html?matchId=${c.id}&from=fixtures" class="details-link"><icon-component name="notebook"></icon-component></a>`;if(m){const W=parseInt(c.homeScore,10),J=parseInt(c.awayScore,10);W>J?P=`<span class="winner">${C}</span>`:J>W&&(R=`<span class="winner">${B}</span>`)}w+=`
                        <tr class="status-${Z}">
                            <td class="date-col">${I}</td>
                            <td class="time-col">${b}</td>
                            <td class="home-team-col">${P}</td>
                            <td class="away-team-col">${R}</td>
                            <td class="score">${H}</td>
                            <td class="status-cell">${z}</td>
                            <td class="competition-col">${L}</td>
                            <td class="round-col">${M}</td>
                        </tr>`}}}w+="</tbody>",r+=`
            <details class="week-details" open>
                <summary class="${U}">Week Commencing: ${y}</summary>
                <div class="table-container">
                    <table class="results-table">
                        ${k}
                        ${w}
                    </table>
                </div>
            </details>`}n.innerHTML=r}async function N(){const e=document.getElementById("team-filter").value,s=document.getElementById("competition-filter").value,n=e||s;let o=g.filter(t=>{const a=t.awayTeamId||t.awayTeamis,l=!e||t.homeTeamId===e||a===e,r=!s||t.division===s;return l&&r});if(p==="fixtures"){let a=[...o.filter(l=>(!l.status||l.status==="scheduled"||l.status==="rescheduled")&&l.homeScore==null)];if(!n){const l=st(g);a.push(...l)}q(a,"fixtures-container")}else if(p==="results"){let t=o.filter(a=>a.status==="completed"||a.homeScore!=null&&a.awayScore!=null&&a.status!=="postponed");q(t,"results-container")}else if(p==="postponed"){let t=o.filter(a=>a.status==="postponed");q(t,"postponements-container")}}function at(){const e=document.getElementById("team-filter").value,s=document.getElementById("competition-filter").value,n=[...new Set(g.map(t=>t.division))];ot(n);const o=new Set;g.forEach(t=>{D.has(t.homeTeamId)&&o.add(t.homeTeamId);const a=t.awayTeamId||t.awayTeamis;D.has(a)&&o.add(a)}),nt([...o]),document.getElementById("competition-filter").value=s,document.getElementById("team-filter").value=e}function ot(e){const s=document.getElementById("competition-filter");s.innerHTML='<option value="">All Competitions</option>',e.forEach(n=>{const o=F.get(n);if(o&&o.fixtures===!0){const t=document.createElement("option");t.value=n,t.textContent=o.name,s.appendChild(t)}})}function nt(e){const s=document.getElementById("team-filter");s.innerHTML='<option value="">All Teams</option>',e.map(o=>{var t;return{id:o,name:(t=D.get(o))==null?void 0:t.name}}).filter(o=>o.name).sort((o,t)=>o.name.localeCompare(t.name)).forEach(o=>{const t=document.createElement("option");t.value=o.id,t.textContent=o.name,s.appendChild(t)})}async function ct(){const e=document.getElementById("season-filter");let s=null;try{const t=_(S($,"seasons"),j("status","==","current"),Q(1)),a=await T(t);a.empty||(s=a.docs[0].id)}catch(t){console.error("Error fetching current season:",t)}const n=await T(S($,"match_results")),o=[...new Set(n.docs.map(t=>t.data().season).filter(Boolean))].sort((t,a)=>a.localeCompare(t));e.innerHTML="",!s&&o.length>0&&(s=o[0]),o.forEach(t=>{const a=document.createElement("option");a.value=t,a.textContent=t,t===s&&(a.selected=!0),e.appendChild(a)}),await G()}async function G(){const e=document.getElementById("season-filter").value;e&&(document.getElementById("fixtures-container").innerHTML="<p>Loading fixtures...</p>",document.getElementById("results-container").innerHTML="",document.getElementById("postponements-container").innerHTML="",await et(e),at(),N())}function lt(){const e=document.getElementById("apply-filters-btn");e.onclick=()=>{N(),document.querySelector("popup-menu").shadowRoot.querySelector(".popup-content").classList.remove("visible")},document.querySelector(".tab-bar").addEventListener("click",s=>{s.target.matches(".tab-link")&&(p=s.target.dataset.tab,document.querySelectorAll(".tab-link").forEach(n=>n.classList.remove("active")),document.querySelectorAll(".tab-pane").forEach(n=>n.classList.remove("active")),s.target.classList.add("active"),document.getElementById(p).classList.add("active"),N())}),document.getElementById("season-filter").addEventListener("change",G)}async function rt(){await Promise.all([X(),tt()]),await ct(),lt()}rt();

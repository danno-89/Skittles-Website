import"./modulepreload-polyfill-B5Qt9EMX.js";import{g as I,d as O,b as C,e as N,c as M,q as P,w as k}from"./firebase.config-IpTQKhZm.js";/* empty css             */import"./main-DLzLBIiP.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const p=document.getElementById("group-container"),D=document.getElementById("season-filter"),f=document.getElementById("group-tabs-container"),R=async()=>{const d={};try{(await N(M(C,"teams"))).forEach(m=>{d[m.id]=m.data().name})}catch(l){console.error("Error fetching team data:",l)}return d},j=async(d,l)=>{const m=[];try{const b=P(M(C,"match_results"),k("season","==",d),k("division","==","ssc-cup"),k("round","==",l));(await N(b)).forEach(T=>{m.push({id:T.id,...T.data()})})}catch(b){console.error(`Error fetching fixtures for ${l}:`,b)}return m},U=d=>{const l=new Date(d),m=l.getDay(),b=l.getDate()-m+(m===0?-6:1);return new Date(l.setDate(b))};if(p&&D&&f){let d={},l={};const m=async()=>{try{const t=(await N(M(C,"ssc_cup"))).docs.map(o=>o.id).sort((o,n)=>n.localeCompare(o));D.innerHTML='<option value="">Select a Season</option>',t.forEach(o=>{const n=document.createElement("option");n.value=o,n.textContent=o,D.appendChild(n)}),t.length>0&&(D.value=t[0],q(t[0]))}catch(s){console.error("Error loading seasons:",s)}},b=s=>{const t=document.createElement("div");if(t.className="table-container",!s||!Array.isArray(s.standings))return t;const o=s.standings.map(e=>({teamName:d[e.teamName]||e.teamName,played:e.played??0,won:e.won??0,drawn:e.drawn??0,lost:e.lost??0,points:e.points??0})),n=document.createElement("table");n.className="league-standings-table styled-table",n.innerHTML=`
            <thead>
                <tr>
                    <th class="pos-col">Pos</th>
                    <th class="team-name-col">Team</th>
                    <th class="number-col">Pld</th>
                    <th class="number-col">W</th>
                    <th class="number-col">D</th>
                    <th class="number-col">L</th>
                    <th class="pts-col number-col">Pts</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;const i=n.querySelector("tbody");return o.sort((e,c)=>c.points-e.points||c.played-e.played||e.teamName.localeCompare(c.teamName)),o.forEach((e,c)=>{const y=document.createElement("tr");y.innerHTML=`
                <td class="pos-col">${c+1}</td>
                <td class="team-name-col">${e.teamName}</td>
                <td class="number-col">${e.played||"-"}</td>
                <td class="number-col">${e.won||"-"}</td>
                <td class="number-col">${e.drawn||"-"}</td>
                <td class="number-col">${e.lost||"-"}</td>
                <td class="pts-col number-col">${e.points||"-"}</td>
            `,i.appendChild(y)}),t.appendChild(n),t},H=s=>{const t=document.createElement("div");if(t.className="fixtures-container",!s||s.length===0)return t.innerHTML="<p>No fixtures available for this group.</p>",t;const o=s.reduce((e,c)=>{if(!c.scheduledDate)return e;const y=c.scheduledDate.toDate?c.scheduledDate.toDate():new Date(c.scheduledDate);if(isNaN(y.getTime()))return e;const r=U(y).toISOString().split("T")[0];return e[r]||(e[r]=[]),e[r].push(c),e},{}),n=Object.keys(o).sort((e,c)=>new Date(e)-new Date(c));let i="";return n.forEach(e=>{const c=o[e].sort((a,h)=>{const g=a.scheduledDate.toDate?a.scheduledDate.toDate():new Date(a.scheduledDate),w=h.scheduledDate.toDate?h.scheduledDate.toDate():new Date(h.scheduledDate);return g-w}),r=new Date(e).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});i+='<details class="week-details" open>',i+=`<summary class="week-summary">Week Commencing: ${r}</summary>`,i+=`<table class="results-table league-standings-table styled-table">
                        <thead>
                            <tr>
                                <th class="date-col">Date</th>
                                <th class="time-col">Time</th>
                                <th class="home-team-col">Home Team</th>
                                <th class="away-team-col">Away Team</th>
                                <th class="score-col">Score</th>
                                <th class="score-balance-col">Score Balance</th>
                                <th class="status-col">Status</th>
                            </tr>
                        </thead>
                        <tbody>`,c.forEach(a=>{const h=a.homeTeamId,g=a.awayTeamId,w=d[h]||"Unknown Team",S=d[g]||"Unknown Team",u=a.scheduledDate.toDate?a.scheduledDate.toDate():new Date(a.scheduledDate),W=u.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),_=u.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0}),G=typeof a.home_score=="number"&&typeof a.away_score=="number"||typeof a.homeScore=="number"&&typeof a.awayScore=="number"?`${a.homeScore||a.home_score} - ${a.awayScore||a.away_score}`:"-";let A="";const v=l[h],E=l[g];if(v&&E){const B=Math.round(Math.abs(v-E)*.95);if(B>0){const F=v<E?w:S;A=`+${B} for ${F}`}}let L="",$="";a.status&&a.status.toLowerCase()==="rescheduled"?(L="status-rescheduled",$="Rescheduled"):a.status&&a.status.toLowerCase()==="postponed"&&(L="status-postponed",$="Postponed"),i+=`
                    <tr class="${L}">
                        <td class="date-col">${W}</td>
                        <td class="time-col">${_}</td>
                        <td class="home-team-col">${w}</td>
                        <td class="away-team-col">${S}</td>
                        <td class="score-col">${G}</td>
                        <td class="score-balance-col">${A}</td>
                        <td class="status-col">${$}</td>
                    </tr>
                `}),i+="</tbody></table></details>"}),t.innerHTML=i,t},T=s=>{f.querySelectorAll(".tab-link").forEach(n=>n.classList.remove("active")),p.querySelectorAll(".group-content").forEach(n=>n.style.display="none");const t=f.querySelector(`[data-group="${s}"]`),o=p.querySelector(`[data-group-content="${s}"]`);t&&t.classList.add("active"),o&&(o.style.display="block")},q=async s=>{if(p.innerHTML="<p>Loading data...</p>",f.innerHTML="",!s){p.innerHTML="";return}try{const t=await I(O(C,"ssc_cup",s));if(t.exists()){const o=t.data();l=o.teamAverages||{};const n=Object.keys(o).sort();p.innerHTML="";let i=!0;for(const e of n)if(e.toLowerCase().startsWith("group")){const c=o[e],y=e.split("_")[1],r=document.createElement("div");r.className="group-content",r.dataset.groupContent=e;const a=b(c);r.appendChild(a);const h=document.createElement("h2");h.textContent="Group Fixtures",h.className="group-fixtures-subheader",r.appendChild(h);const g=document.createElement("div");g.className="handicap-narrative",g.innerHTML=`
                            <p>As the SSC Cup is a Score Balanced competition, for each fixture, one team will be awarded an additional score of pins, based on the teams average scores (since the start of Sep 2024) in order to balance the match.</p>
                            <p>All fixtures should be played as normal with the additional pins, indicated in the score balance column, added to the final score of the match.</p>
                            <p>Where no score is provided, there is no balancing score as the averages are already similar.</p>
                        `,r.appendChild(g);const w=await j(s,`Group Stage - ${y}`),S=H(w);r.appendChild(S),p.appendChild(r);const u=document.createElement("a");u.className="tab-link",u.dataset.group=e,u.textContent=e.replace(/_/g," "),u.onclick=()=>T(e),f.appendChild(u),i?(u.classList.add("active"),r.style.display="block",i=!1):r.style.display="none"}}else p.innerHTML=`<p>No cup data found for the ${s} season.</p>`}catch(t){console.error("Error loading cup data:",t),p.innerHTML="<p>Error loading cup data.</p>"}};D.addEventListener("change",s=>{q(s.target.value)}),R().then(s=>{d=s,m()})}

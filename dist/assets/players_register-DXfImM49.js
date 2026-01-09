import"./modulepreload-polyfill-B5Qt9EMX.js";import{e as x,c as g,b as N}from"./firebase.config-IpTQKhZm.js";import"./main-CA5my9sR.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const m=document.getElementById("players-table-container");if(m){let p=[];const y=new Map;let s={column:"fullName",direction:"asc"};const d=document.getElementById("team-filter"),f=document.getElementById("show-expired-filter"),h=document.getElementById("expiring-soon-filter"),E=e=>{if(!e)return null;if(e.seconds)return new Date(e.seconds*1e3);if(typeof e=="string"){const a=e.split("/");if(a.length===3){const t=parseInt(a[0],10),n=parseInt(a[1],10)-1,i=parseInt(a[2],10);if(!isNaN(t)&&!isNaN(n)&&!isNaN(i)){const o=i<100?2e3+i:i;return new Date(o,n,t)}}}const r=new Date(e);return r instanceof Date&&!isNaN(r.getTime())?r:null},u=e=>{const r=E(e);return r?r.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"2-digit"}).replace(/ /g," "):"N/A"},S=e=>{if(!e)return{daysUntilExpiry:1/0,expiryStatus:"N/A"};const r=E(e);if(!r)return{daysUntilExpiry:1/0,expiryStatus:"Invalid Date"};const a=new Date;a.setHours(0,0,0,0);const t=r.getTime()-a.getTime(),n=Math.ceil(t/(1e3*3600*24)),i=n<0?"Expired":"Active";return{daysUntilExpiry:n,expiryStatus:i}},T=async()=>{try{const[e,r]=await Promise.all([x(g(N,"players_public")),x(g(N,"teams"))]);r.forEach(t=>{y.set(t.id,t.data().name||"Unknown Team")});const a=new Set;p=e.docs.map(t=>{const n=t.data();a.add(n.teamId);const i=S(n.registerExpiry);return{...n,id:t.id,fullName:`${n.firstName||""} ${n.lastName||""}`.trim(),teamName:y.get(n.teamId)||"N/A",...i}}),b(a),l()}catch(e){console.error("Error fetching data:",e),m.innerHTML="<p>Error loading player data.</p>"}},b=e=>{Array.from(y.entries()).filter(([a,t])=>e.has(a)).sort((a,t)=>a[1].localeCompare(t[1])).forEach(([a,t])=>{const n=document.createElement("option");n.value=a,n.textContent=t,d.appendChild(n)})},l=()=>{let e=[...p];d.value&&(e=e.filter(t=>t.teamId===d.value)),f.checked||(e=e.filter(t=>t.expiryStatus!=="Expired")),h.checked&&(e=e.filter(t=>t.daysUntilExpiry>=0&&t.daysUntilExpiry<=30)),e.sort((t,n)=>{const i=t[s.column]??"",o=n[s.column]??"";let c=0;if(s.column==="daysUntilExpiry"){const I=i===1/0||i===null?Number.MAX_SAFE_INTEGER:i,A=o===1/0||o===null?Number.MAX_SAFE_INTEGER:o;c=I-A}else typeof i=="number"&&typeof o=="number"?c=i-o:c=String(i).localeCompare(String(o),void 0,{numeric:!0});return s.direction==="asc"?c:-c}),m.innerHTML="";const r=document.createElement("table");r.innerHTML=`
          <thead>
            <tr>
              <th data-sort-key="fullName">Player Name</th>
              <th data-sort-key="teamName">Team</th>
              <th data-sort-key="registerDate">Registration Date</th>
              <th data-sort-key="recentFixture">Recent Fixture</th>
              <th data-sort-key="registerExpiry">Registration Expiry</th>
              <th data-sort-key="daysUntilExpiry">Days to Expiry</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;const a=r.querySelector("tbody");e.length===0?a.innerHTML='<tr><td colspan="6">No players match the current filters.</td></tr>':e.forEach(t=>{const n=t.expiryStatus==="Expired",i=n?'class="expired-player"':"",o=n?"Expired":t.daysUntilExpiry===1/0?"N/A":t.daysUntilExpiry,c=`
                  <tr ${i}>
                    <td>${t.fullName}</td>
                    <td>${t.teamName}</td>
                    <td>${u(t.registerDate)}</td>
                    <td>${u(t.recentFixture)}</td>
                    <td>${u(t.registerExpiry)}</td>
                    <td>${o}</td>
                  </tr>
                `;a.innerHTML+=c}),r.querySelectorAll("th").forEach(t=>{t.dataset.sortKey===s.column&&t.classList.add(s.direction),t.addEventListener("click",D)}),m.appendChild(r)},D=e=>{const r=e.target.dataset.sortKey;r&&(s.column===r?s.direction=s.direction==="asc"?"desc":"asc":(s.column=r,s.direction="asc"),l())};d.addEventListener("change",l),f.addEventListener("change",l),h.addEventListener("change",l),T()}

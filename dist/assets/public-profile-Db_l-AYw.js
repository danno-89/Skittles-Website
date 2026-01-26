import"./modulepreload-polyfill-B5Qt9EMX.js";import{g as I,d as M,b as v,q as k,w as S,c as $,e as b}from"./firebase.config-IpTQKhZm.js";/* empty css                     *//* empty css             */import"./main-DLzLBIiP.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const T=a=>{if(!a||!a.toDate)return"N/A";const o=a.toDate(),r=o.getDate(),i=o.getFullYear(),e=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][o.getMonth()];return`${r} ${e} ${i}`};async function A(a,o){if(!o||!a)return[];const r=[],i=k($(v,"match_results"),S("homeTeamId","==",o),S("status","==","completed")),n=k($(v,"match_results"),S("awayTeamId","==",o),S("status","==","completed")),[e,m]=await Promise.all([b(i),b(n)]),t=(l,d)=>{l.forEach(u=>{const c=u.data(),y=d?c.homeScores:c.awayScores,s=d?c.awayTeamId:c.homeTeamId,p=y.find(h=>h.playerId===a);if(p){const h=[...c.homeScores,...c.awayScores].map(g=>g.score),f=y.map(g=>g.score);h.sort((g,w)=>w-g),f.sort((g,w)=>w-g);const D=h.indexOf(p.score)+1,P=f.indexOf(p.score)+1;r.push({...p,date:c.scheduledDate,opponent:s,matchId:u.id,teamScore:d?c.homeScore:c.awayScore,opponentScore:d?c.awayScore:c.homeScore,competitionId:c.division,teamRank:P,matchRank:D})}})};return t(e,!0),t(m,!1),r.sort((l,d)=>l.date.toDate()-d.date.toDate()),r}const x=(a,o)=>{const r=a.flatMap(t=>t.hands);let i=0,n=0;for(const t of r)t>=o?n++:(i=Math.max(i,n),n=0);i=Math.max(i,n);let e=0;for(let t=r.length-1;t>=0&&r[t]>=o;t--)e++;return{total:r.filter(t=>t===o).length,bestStreak:i,currentStreak:e}};function B(a){if(a.length===0)return{fixturesPlayed:0,totalPins:0,averageScore:"N/A",leagueAverageScore:"N/A",highScore:0,totalSpares:0,sevens:{total:0,bestStreak:0,currentStreak:0},eights:{total:0,bestStreak:0,currentStreak:0},nines:{total:0,bestStreak:0,currentStreak:0}};const o=a.reduce((t,l)=>t+l.score,0),r=Math.max(...a.map(t=>t.score)),i=a.reduce((t,l)=>t+l.hands.filter(d=>d>=10).length,0),n=a.filter(t=>t.competitionId==="premier-division"||t.competitionId==="first-division"),e=n.reduce((t,l)=>t+l.score,0),m=n.length>0?(e/n.length).toFixed(2):"N/A";return{fixturesPlayed:a.length,totalPins:o,averageScore:(o/a.length).toFixed(2),leagueAverageScore:m,highScore:r,totalSpares:i,sevens:x(a,7),eights:x(a,8),nines:x(a,9)}}async function C(a,o,r,i){document.getElementById("stats-player-name-header").textContent=o,document.getElementById("stats-team-name-header").textContent=i;const n=await A(a,r),e=B(n),m=document.getElementById("main-stats-grid"),t=document.getElementById("streak-stats-grid");m.innerHTML=`
        <div class="stat-box"><h4>Fixtures Played</h4><p>${e.fixturesPlayed}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${e.totalPins}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${e.highScore}</p></div>
        <div class="stat-box"><h4>Overall Average</h4><p>${e.averageScore}</p></div>
        <div class="stat-box"><h4>League Average</h4><p>${e.leagueAverageScore}</p></div>
        <div class="stat-box"><h4>Spares</h4><p>${e.totalSpares}</p></div>
    `,t.innerHTML=`
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>9s</h4><p class="stat-total">${e.nines.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${e.nines.bestStreak}</p><p><strong>Current:</strong> ${e.nines.currentStreak}</p></div></div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>8s</h4><p class="stat-total">${e.eights.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${e.eights.bestStreak}</p><p><strong>Current:</strong> ${e.eights.currentStreak}</p></div></div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>7s</h4><p class="stat-total">${e.sevens.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${e.sevens.bestStreak}</p><p><strong>Current:</strong> ${e.sevens.currentStreak}</p></div></div>
        </div>
    `,n.sort((d,u)=>u.date.toDate()-d.date.toDate());const l=document.querySelector(".stats-results-table");if(n.length>0){const d=new Map,u=new Map,c=[...new Set(n.map(s=>s.opponent))],y=[...new Set(n.map(s=>s.competitionId))];if(c.length>0){const s=k($(v,"teams"),S("__name__","in",c));(await b(s)).forEach(h=>d.set(h.id,h.data().name))}if(y.length>0){const s=k($(v,"competitions"),S("__name__","in",y));(await b(s)).forEach(h=>u.set(h.id,h.data().name))}l.innerHTML=`
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                            <th>Total</th>
                            <th>Team Rank</th>
                            <th>Match Rank</th>
                            <th>Opponent</th>
                            <th>Competition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${n.map(s=>{let p="draw";s.teamScore>s.opponentScore&&(p="win"),s.teamScore<s.opponentScore&&(p="loss");const h=s.date.toDate().toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:!0});return`
                                <tr>
                                    <td><span class="result-indicator ${p}"></span></td>
                                    <td>${T(s.date)}</td>
                                    <td>${h}</td>
                                    ${s.hands.map(f=>`<td><span class="${f>=10?"highlight-score":""}">${f}</span></td>`).join("")}
                                    <td><strong>${s.score}</strong></td>
                                    <td>${s.teamRank===1?'<span class="rank-one">1</span>':s.teamRank}</td>
                                    <td>${s.matchRank===1?'<span class="rank-one">1</span>':s.matchRank}</td>
                                    <td>${d.get(s.opponent)||"Unknown"}</td>
                                    <td>${u.get(s.competitionId)||"N/A"}</td>
                                </tr>
                            `}).join("")}
                    </tbody>
                </table>
            </div>
        `}else l.innerHTML="<p>No match results found for this player.</p>"}async function E(){const a=new URLSearchParams(window.location.search),o=a.get("playerId"),r=a.get("returnUrl");if(r){const t=document.getElementById("back-btn");t&&(t.href=r)}if(!o){document.getElementById("statistics-content").innerHTML="<p>Player ID not provided.</p>";return}const i=await I(M(v,"players_public",o));if(!i.exists()){document.getElementById("statistics-content").innerHTML="<p>Player not found.</p>";return}const n=i.data(),e=await I(M(v,"teams",n.teamId)),m=e.exists()?e.data().name:"Unknown Team";await C(o,`${n.firstName} ${n.lastName}`,n.teamId,m)}document.addEventListener("DOMContentLoaded",E);

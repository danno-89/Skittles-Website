import"./modulepreload-polyfill-B5Qt9EMX.js";import{g as N,d as P,b as k,q as $,w as f,c as x,e as b}from"./firebase.config-IpTQKhZm.js";/* empty css                     *//* empty css             */import{a as T}from"./main-DLzLBIiP.js";import"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";const y=a=>{if(!a||!a.toDate)return"N/A";const e=a.toDate(),t=e.getDate(),s=e.getFullYear(),d=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][e.getMonth()];return`${t} ${d} ${s}`},L=a=>{if(!a||!a.toDate)return"N/A";const e=a.toDate();let t=e.getHours();const s=e.getMinutes().toString().padStart(2,"0"),o=t>=12?"PM":"AM";return t=t%12,t=t||12,`${t}:${s} ${o}`},C=()=>{const a=document.querySelectorAll(".tab-link"),e=document.querySelectorAll(".tab-pane");a.forEach(t=>{t.addEventListener("click",()=>{const s=t.dataset.tab;a.forEach(o=>o.classList.remove("active")),t.classList.add("active"),e.forEach(o=>{o&&(o.id===`${s}-content`?o.classList.add("active"):o.classList.remove("active"))})})})};async function B(a,e){if(!e||!a)return{chronologicalScores:[],reversedScores:[]};const t=[],s=$(x(k,"match_results"),f("homeTeamId","==",e),f("status","==","completed")),o=$(x(k,"match_results"),f("awayTeamId","==",e),f("status","==","completed")),[d,n]=await Promise.all([b(s),b(o)]),l=(v,m)=>{v.forEach(r=>{const c=r.data(),S=m?c.homeScores:c.awayScores,i=m?c.awayTeamId:c.homeTeamId,p=S.find(h=>h.playerId===a);if(p){const h=[...c.homeScores,...c.awayScores].map(u=>u.score),M=S.map(u=>u.score);h.sort((u,w)=>w-u),M.sort((u,w)=>w-u);const E=h.indexOf(p.score)+1,A=M.indexOf(p.score)+1;t.push({...p,date:c.scheduledDate,opponent:i,matchId:r.id,teamScore:m?c.homeScore:c.awayScore,opponentScore:m?c.awayScore:c.homeScore,competitionId:c.division,teamRank:A,matchRank:E})}})};l(d,!0),l(n,!1),t.sort((v,m)=>v.date.toDate()-m.date.toDate());const g=[...t].reverse();return{chronologicalScores:t,reversedScores:g}}const I=(a,e)=>{let t=0,s=0;for(const n of a)n>=e?s++:(s>t&&(t=s),s=0);s>t&&(t=s);let o=0;const d=[...a].reverse();for(const n of d)if(n>=e)o++;else break;return{bestStreak:t,currentStreak:o}};function H(a){if(a.length===0)return{fixturesPlayed:0,totalPins:0,averageScore:"N/A",leagueAverageScore:"N/A",highScore:0,totalSpares:0,sevens:{total:0,bestStreak:0,currentStreak:0},eights:{total:0,bestStreak:0,currentStreak:0},nines:{total:0,bestStreak:0,currentStreak:0}};const e=a.reduce((r,c)=>r+c.score,0),t=Math.max(...a.map(r=>r.score)),s=a.reduce((r,c)=>r+c.hands.filter(S=>S>=10).length,0),o=a.filter(r=>r.competitionId==="premier-division"||r.competitionId==="first-division"),d=o.reduce((r,c)=>r+c.score,0),n=o.length>0?(d/o.length).toFixed(2):"N/A",l=a.flatMap(r=>r.hands),g=l.filter(r=>r===7).length,v=l.filter(r=>r===8).length,m=l.filter(r=>r===9).length;return{fixturesPlayed:a.length,totalPins:e,averageScore:(e/a.length).toFixed(2),leagueAverageScore:n,highScore:t,totalSpares:s,sevens:{total:g,...I(l,7)},eights:{total:v,...I(l,8)},nines:{total:m,...I(l,9)}}}async function F(a,e,t,s){document.getElementById("stats-player-name").textContent=e,document.getElementById("stats-team-name").textContent=s;const{chronologicalScores:o,reversedScores:d}=await B(a,t),n=H(o),l=document.getElementById("main-stats-grid"),g=document.getElementById("streak-stats-grid");l.innerHTML=`
        <div class="stat-box"><h4>Fixtures Played</h4><p>${n.fixturesPlayed}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${n.totalPins}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${n.highScore}</p></div>
        <div class="stat-box"><h4>Overall Average</h4><p>${n.averageScore}</p></div>
        <div class="stat-box"><h4>League Average</h4><p>${n.leagueAverageScore}</p></div>
        <div class="stat-box"><h4>Spares</h4><p>${n.totalSpares}</p></div>
    `,g.innerHTML=`
        <div class="stat-box detailed-stat">
            <div class="stat-content">
                <div class="stat-main">
                    <h4>9s</h4>
                    <div class="stat-total">${n.nines.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${n.nines.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${n.nines.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-content">
                <div class="stat-main">
                    <h4>8s</h4>
                    <div class="stat-total">${n.eights.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${n.eights.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${n.eights.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-content">
                <div class="stat-main">
                    <h4>7s</h4>
                    <div class="stat-total">${n.sevens.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${n.sevens.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${n.sevens.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
    `;const v=document.querySelector(".stats-results-table");if(d.length>0){const m=new Map,r=new Map,c=[...new Set(d.map(i=>i.opponent))],S=[...new Set(d.map(i=>i.competitionId))];if(c.length>0){const i=$(x(k,"teams"),f("__name__","in",c));(await b(i)).forEach(h=>m.set(h.id,h.data().name))}if(S.length>0){const i=$(x(k,"competitions"),f("__name__","in",S));(await b(i)).forEach(h=>r.set(h.id,h.data().name))}v.innerHTML=`
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
                        ${d.map(i=>{let p="draw";return i.teamScore>i.opponentScore&&(p="win"),i.teamScore<i.opponentScore&&(p="loss"),`
                                <tr>
                                    <td><span class="result-indicator ${p}"></span></td>
                                    <td>${y(i.date)}</td>
                                    <td>${L(i.date)}</td>
                                    ${i.hands.map(h=>`<td><span class="${h>=10?"highlight-score":""}">${h}</span></td>`).join("")}
                                    <td><strong>${i.score}</strong></td>
                                    <td>${i.teamRank===1?'<span class="rank-one">1</span>':i.teamRank}</td>
                                    <td>${i.matchRank===1?'<span class="rank-one">1</span>':i.matchRank}</td>
                                    <td>${m.get(i.opponent)||"Unknown"}</td>
                                    <td>${r.get(i.competitionId)||"N/A"}</td>
                                </tr>
                            `}).join("")}
                    </tbody>
                </table>
            </div>
        `}else v.innerHTML="<p>No match results found for this player.</p>"}async function R(a,e,t){const s=(n,l)=>{const g=document.getElementById(n);g&&(g.textContent=l||"N/A")};let o="N/A",d=null;if(e){if(s("first-name",e.firstName),s("last-name",e.lastName),s("role",e.role),s("registration-date",y(e.registerDate)),s("recent-fixture",y(e.recentFixture)),s("division",e.division),e.teamId){d=e.teamId;const n=await N(P(k,"teams",d));n.exists()&&(o=n.data().name,s("team-name",o))}if(e.registerExpiry){const n=e.registerExpiry.toDate(),l=Math.ceil((n-new Date)/(1e3*3600*24));s("register-expiry",y(e.registerExpiry)),s("days-to-expiry",l>0?l:"Expired")}await F(e.publicId,`${e.firstName} ${e.lastName}`,d,o)}t&&(s("email",t.email),s("dob",y(t.dob)),s("mobile-no",t.mobileNo),s("home-no",t.homeNo),t.address&&(s("address-line-1",t.address.line1),s("address-line-2",t.address.line2),s("address-line-3",t.address.line3),s("parish",t.address.parish),s("postcode",t.address.postCode)))}document.addEventListener("DOMContentLoaded",()=>{T.then(async({user:a,publicData:e,privateData:t})=>{const s=document.getElementById("profile-form");if(!a){s.innerHTML='<div class="page-header"><h1>My Profile</h1></div><div class="card"><p>Please log in to view your profile.</p><a href="/index.html" class="btn btn-primary">Log In</a></div>';return}if(e&&t)C(),await R(a,e,t);else{const o=document.getElementById("personal-details-content");o.innerHTML='<div class="card-no-hover"><h2 class="heading-border">Profile Not Found</h2><div class="profile-details"><p>We could not find a player profile linked to your user account.</p><p>Please contact a committee member if you believe this is an error.</p></div></div>',document.getElementById("statistics-content").innerHTML=""}}).catch(a=>{console.error("Error initializing profile page:",a)})});

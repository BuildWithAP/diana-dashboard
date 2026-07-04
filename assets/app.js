/* Diana Dashboard — render engine. Renders each page from window.DIANA.
   Invoked by gate.js once the data has been decrypted. */
window.startApp = function(){
  const D = window.DIANA;
  const C = D.contacts;
  const view = document.getElementById('view');
  const page = document.body.dataset.page;

  /* ---------- helpers ---------- */
  const naira = n => '₦' + Number(n).toLocaleString('en-NG');
  const usd   = n => '$' + Number(n).toLocaleString('en-US');
  const nairaShort = n => n>=1e6 ? '₦'+(n/1e6).toFixed(n%1e6?1:0)+'M' : '₦'+Number(n).toLocaleString('en-NG');
  const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
  const ci = n => '<span class="cnt" data-to="'+n+'">0</span>';  // count-up integer

  function sprint(){
    const start = new Date(D.meta.sprintStartISO+'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((today - start)/86400000);
    const day = Math.max(1, diff+1);
    const remaining = Math.max(0, D.meta.sprintDays - day);
    return { day, remaining, pct: Math.min(1, day/D.meta.sprintDays) };
  }
  const STAGES = ['lead','engaged','call-done','onboarded','active'];
  const STAGE_LABEL = {lead:'Lead',engaged:'Engaged','call-done':'Call done',onboarded:'Onboarded',active:'Active'};
  const STAGE_CLASS = {lead:'b-lead',engaged:'b-engaged','call-done':'b-call',onboarded:'b-onboarded',active:'b-active'};
  const STAGE_COLOR = {lead:'#9AA6B4',engaged:'var(--amber)','call-done':'var(--blue-2)',onboarded:'var(--green)',active:'#1c8a3f'};

  const doctors = C.filter(c=>c.type==='doctor');
  const nurses  = C.filter(c=>c.type==='nurse');
  const hmo     = C.filter(c=>c.type==='hmo');
  const countStage = s => C.filter(c=>c.stage===s).length;
  const active = countStage('active'), onboarded = countStage('onboarded'), engaged = countStage('engaged');

  function tally(key){ const m={}; C.forEach(c=>{const k=c[key]||'—'; m[k]=(m[k]||0)+1;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); }

  function badge(stage){ return `<span class="badge ${STAGE_CLASS[stage]}">${STAGE_LABEL[stage]}</span>`; }

  function ring(pct, big, of){
    const r=52, c=2*Math.PI*r, off=c*(1-pct);
    return `<svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="13"/>
      <circle class="ringfill" cx="70" cy="70" r="${r}" fill="none" stroke="#F2B33D" stroke-width="13" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}" transform="rotate(-90 70 70)"/>
      <text x="70" y="66" text-anchor="middle" fill="#fff" font-family="Bricolage Grotesque" font-weight="800" font-size="30">${big}</text>
      <text x="70" y="88" text-anchor="middle" fill="#9fb1c6" font-family="Mulish" font-weight="700" font-size="12">${of}</text>
    </svg>`;
  }
  function barlist(entries, color, max){
    const mx = max || Math.max(...entries.map(e=>e[1]), 1);
    return `<div class="barlist">`+entries.map(([n,v])=>
      `<div class="bl"><div class="nm" title="${n}">${n}</div><div class="track"><div class="fill" style="--w:${Math.max(4,v/mx*100)}%;background:${color}"></div></div><div class="vv">${v}</div></div>`
    ).join('')+`</div>`;
  }
  function stat(topColor, value, label, sub){
    return `<div class="card stat"><div class="top ${topColor}"></div><div class="v">${value}</div><div class="lab">${label}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>`;
  }
  function phead(kick, title, sub){
    const s=sprint();
    return `<div class="phead"><div><div class="kick">${kick}</div><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>
      <div class="sprintpill"><div class="d">Day ${s.day} / ${D.meta.sprintDays}</div><div class="l">${s.remaining} days left · updated ${D.meta.lastUpdated}</div></div></div>`;
  }

  /* ---------- sidebar ---------- */
  const NAV=[['overview','Overview','index.html','◆'],['network','Network','network.html','🕸'],['onboarding','Onboarding','onboarding.html','🩺'],['finance','Finance','finance.html','₦'],['tasks','Tasks','tasks.html','✓']];
  document.getElementById('sidebar').innerHTML =
    `<div class="sb-brand"><div class="nm">Diana</div><div class="rl">${D.meta.role}<br>${D.meta.region} · MVT</div></div>
     <nav class="sb-nav">`+NAV.map(([k,l,h,ic])=>`<a href="${h}" class="${k===page?'active':''}"><span class="ic">${ic}</span>${l}</a>`).join('')+`</nav>
     <div class="sb-foot">Goal: <b>300 active</b> referring doctors in <b>90 days</b>.<br>Manager: ${D.meta.manager}</div>`;

  /* ---------- pages ---------- */
  function pOverview(){
    const f=D.goal.funnel, fx=D.meta.fxNairaPerUsd;
    const cards = [
      stat('bg-blue', ci(C.length), 'Contacts in network', `${doctors.length} doctors · ${nurses.length} nurses · ${hmo.length} HMO/admin`),
      stat('bg-amber', ci(engaged), 'Engaged & warming', 'spoken to, interested'),
      stat('bg-green', ci(onboarded), 'Onboarded', 'KYC + pitch done'),
      stat('bg-ink', ci(active)+' <small>/ 300</small>', 'Active referrers', 'next milestone: the 1st inquiry')
    ].join('');
    const funnelRows = [
      ['Leads / contacts', C.length, f.leadsTarget, 'var(--blue)'],
      ['Onboarded', onboarded, f.onboardedTarget, 'var(--green)'],
      ['Active', active, f.activeTarget, 'var(--amber)']
    ].map(([nm,v,t,col])=>`<div class="fl"><div class="nm">${nm}</div><div class="track"><div class="fill" style="--w:${Math.max(2,v/t*100)}%;background:${col}">${v}</div></div><div class="tgt">target ${t.toLocaleString()}</div></div>`).join('');
    view.innerHTML = phead('Progress', 'Where Diana stands', `${D.meta.region} · ${D.goal.target} ${D.goal.metric} in ${D.goal.horizon}`)
    + `<div class="grid g4">${cards}</div>`
    + `<div class="herorow" style="margin-top:18px">
        <div class="card ringcard"><div class="cap">The Goal</div>${ring(active/D.goal.target, active, 'of 300 active')}<div class="of">0% — the climb starts now</div></div>
        <div class="card pad-lg"><h3>Funnel vs target</h3><p class="muted" style="margin:4px 0 16px">Start wide, qualify hard — ~900 leads become ~300 active.</p><div class="funnel">${funnelRows}</div></div>
       </div>`
    + `<div class="grid g2" style="margin-top:18px">
        <div class="card pad-lg"><h3>Money so far</h3>
          <div class="kv"><span class="k">Income (0 patients yet)</span><span class="v t-mute">${naira(D.finance.incomeNaira)}</span></div>
          <div class="kv"><span class="k">Expenses logged</span><span class="v t-amber">${naira(D.finance.expenses.reduce((a,e)=>a+e.naira,0))}</span></div>
          <div class="kv"><span class="k">Projected Year 1</span><span class="v t-green">${nairaShort(D.finance.projection.year1Naira)} · ${usd(D.finance.projection.year1Usd)}</span></div>
          <p class="muted" style="margin-top:12px">Akash is fronting expenses, recouped later from commission. <a href="finance.html" class="t-blue" style="font-weight:800">Finance →</a></p>
        </div>
        <div class="card pad-lg"><h3>Momentum</h3><ul class="note-list">${D.momentum.map(m=>`<li><b style="color:var(--ink)">${m.date}</b> — ${m.text}</li>`).join('')}</ul>
          <div class="callout green" style="margin-top:14px">⭐ <b>Dr. Seleye-Fubara already refers urology cases to India informally</b> — the fastest path to a first inquiry is redirecting that flow to Aster.</div>
        </div>
       </div>`
    + `<div class="card pad-lg" style="margin-top:18px"><h3>Open tasks</h3><p class="muted" style="margin:4px 0 0">${D.tasks.diana.filter(t=>t.status==='now').length} urgent for Diana · ${D.tasks.akash.filter(t=>t.status==='now').length} urgent for Akash. <a href="tasks.html" class="t-blue" style="font-weight:800">See all tasks →</a></p></div>`;
  }

  function pNetwork(){
    const qualifiable = doctors.length;
    view.innerHTML = phead('Strength of Network', 'The network Diana is building', 'Only doctors count toward the 300 — nurses and HMO/admin contacts are strategic bonus channels.')
    + `<div class="grid g4">
        ${stat('bg-blue', ci(C.length), 'Total contacts', `${tally('city').length} cities`)}
        ${stat('bg-green', ci(doctors.length), 'Doctors', 'count toward the goal')}
        ${stat('bg-amber', ci(nurses.length), 'Nurses / midwives', 'bonus channel')}
        ${stat('bg-ink', ci(hmo.length), 'HMO / admin', 'gatekeepers & approvers')}
       </div>
       <div class="grid g2" style="margin-top:18px">
         <div class="card pad-lg"><h3>By stage</h3><div style="margin-top:14px">${barlist(STAGES.filter(s=>countStage(s)).map(s=>[STAGE_LABEL[s],countStage(s)]),'var(--blue)')}</div></div>
         <div class="card pad-lg"><h3>By city</h3><div style="margin-top:14px">${barlist(tally('city'),'var(--green)')}</div></div>
       </div>
       <div class="grid g2" style="margin-top:18px">
         <div class="card pad-lg"><h3>By specialty</h3><div style="margin-top:14px">${barlist(tally('specialty'),'var(--amber)')}</div></div>
         <div class="card pad-lg"><h3>By hospital</h3><div style="margin-top:14px">${barlist(tally('hospital'),'var(--blue-2)')}</div></div>
       </div>
       <div class="card pad-lg" style="margin-top:18px"><h3>Warm but not yet captured</h3><ul class="note-list" style="margin-top:8px">${D.pipelineNotes.map(n=>`<li>${n}</li>`).join('')}</ul></div>`;
  }

  function pOnboarding(){
    const rows = C.map(c=>`<tr>
      <td class="nm">${c.star?'<span class="star">★</span> ':''}${c.name}</td>
      <td>${c.specialty}</td><td>${c.hospital||'—'}</td><td>${c.city||'—'}</td>
      <td>${badge(c.stage)}</td>
      <td class="t-mute">${c.note||(c.folder?'Folder on file':'')}</td></tr>`).join('');
    view.innerHTML = phead('Onboarding Status', 'Every contact, where they stand')
    + `<div class="grid g4">
        ${STAGES.map(s=>stat(s==='active'?'bg-green':s==='onboarded'?'bg-green':s==='engaged'?'bg-amber':'bg-ink', ci(countStage(s)), STAGE_LABEL[s])).join('')}
       </div>
       <div class="callout green" style="margin:18px 0">Stages: Lead → Engaged → Call done → <b>Onboarded</b> (call + KYC + agreement) → <b>Active</b> (≥1 patient inquiry). Doctors get their own folder once they reach <b>Call done</b>.</div>
       <div class="card pad-lg"><table class="tbl"><thead><tr><th>Name</th><th>Specialty</th><th>Hospital</th><th>City</th><th>Stage</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function pFinance(){
    const expTotal = D.finance.expenses.reduce((a,e)=>a+e.naira,0), inc=D.finance.incomeNaira, fx=D.meta.fxNairaPerUsd;
    const expRows = D.finance.expenses.map(e=>`<tr><td>${e.date}</td><td class="nm">${e.label}</td><td>${naira(e.naira)}</td><td><span class="badge b-soon">${cap(e.status)}</span></td></tr>`).join('');
    const comRows = D.finance.commission.map(c=>`<tr><td class="nm">${c.dest}</td><td>${usd(c.avgUsd)}</td><td>${c.totalPct}%</td><td class="t-amber"><b>${c.agentPct}% · ${usd(c.agentUsd)}</b></td><td>${c.doctorPct}% · ${usd(c.doctorUsd)}</td></tr>`).join('');
    view.innerHTML = phead('Expenses vs Income', 'The money picture', 'Conservative projection from the goal-setting model.')
    + `<div class="grid g4">
        ${stat('bg-red', naira(expTotal), 'Expenses logged', 'fronted by Akash, recouped later')}
        ${stat('bg-ink', naira(inc), 'Income to date', `${D.finance.patients} patients · ${D.finance.inquiries} inquiries`)}
        ${stat('bg-amber', naira(D.finance.akashOutlayNaira), 'Akash outlay (to refund)', 'pending')}
        ${stat('bg-green', nairaShort(D.finance.projection.year1Naira), 'Projected Year 1', usd(D.finance.projection.year1Usd)+' · 100 patients')}
       </div>
       <div class="card pad-lg" style="margin-top:18px"><h3>Expenses</h3>
         <table class="tbl" style="margin-top:10px"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead><tbody>${expRows}</tbody></table>
         <div class="callout" style="margin-top:14px">⚠️ The ₦15,000 is Diana's stated figure with <b>soft proof</b> (public transport, no fare receipt; Bolt screenshots are hypothetical quotes). Treat as a reimbursement request — Akash to approve.</div>
       </div>
       <div class="card pad-lg" style="margin-top:18px"><h3>Commission model (per patient)</h3>
         <table class="tbl" style="margin-top:10px"><thead><tr><th>Destination</th><th>Avg bill</th><th>Total comm.</th><th>Diana keeps</th><th>Doctor earns</th></tr></thead><tbody>${comRows}</tbody></table>
         <p class="muted" style="margin-top:12px">Year 1 (100 patients · 20 Dubai + 80 India): <b class="t-green">Diana ≈ ${usd(D.finance.projection.year1Usd)} (≈ ${nairaShort(D.finance.projection.year1Naira)})</b> · doctors ≈ $123,000. Year 2 at +20%: ≈ ${usd(D.finance.projection.year2Usd)}.</p>
       </div>`
    + (D.finance.patientsInProgress && D.finance.patientsInProgress.length ? `<div class="card pad-lg" style="margin-top:18px"><h3>Patients in progress</h3>
         <table class="tbl" style="margin-top:10px"><thead><tr><th>Patient</th><th>Stage</th><th>Note</th></tr></thead><tbody>${
           D.finance.patientsInProgress.map(p=>`<tr><td class="nm">${p.label}</td><td><span class="badge b-soon">${p.stage}</span></td><td class="t-mute">${p.note||''}</td></tr>`).join('')
         }</tbody></table>
         <div class="callout green" style="margin-top:14px">⭐ First patient inquiry — the funnel's first real conversion. Turning this into a completed, paid case is the milestone that makes a doctor "active".</div>
       </div>` : '')
    + (D.finance.fieldVisits && D.finance.fieldVisits.length ? `<div class="card pad-lg" style="margin-top:18px"><h3>Field visits</h3>
         <table class="tbl" style="margin-top:10px"><thead><tr><th>Date</th><th>Place</th><th>Outcome</th><th>Transport</th></tr></thead><tbody>${
           D.finance.fieldVisits.map(v=>`<tr><td>${v.date}</td><td class="nm">${v.place}</td><td class="t-mute">${v.outcome||''}</td><td>${v.naira!=null?naira(v.naira)+' <span class="badge b-soon">'+cap(v.expenseStatus||'')+'</span>':'<span class="t-mute">not logged</span>'}</td></tr>`).join('')
         }</tbody></table>
       </div>` : '');
  }

  function pTasks(){
    const dot = s => ({now:'var(--red)',soon:'var(--amber)',later:'#9AA6B4',done:'var(--green)'}[s]||'#9AA6B4');
    const list = arr => `<div class="tasks">`+arr.map(t=>`<div class="task ${t.status==='done'?'done':''}"><span class="dot" style="background:${dot(t.status)}"></span><span class="tx">${t.text} <span class="badge b-${t.status}" style="margin-left:6px">${t.status}</span></span></div>`).join('')+`</div>`;
    view.innerHTML = phead('Pending Tasks', 'What moves the needle next', 'Red = now · amber = soon · grey = later')
    + `<div class="grid g2">
        <div><div class="section-title">Diana's court (${D.tasks.diana.length})</div>${list(D.tasks.diana)}</div>
        <div><div class="section-title">Akash's court (${D.tasks.akash.length})</div>${list(D.tasks.akash)}</div>
       </div>`;
  }

  function enhance(){
    document.querySelectorAll('#view .card').forEach((c,i)=>c.style.animationDelay=(i*55)+'ms');
    document.querySelectorAll('#view .cnt').forEach(el=>{const to=+el.dataset.to||0,dur=850,t0=performance.now();(function step(t){const p=Math.min(1,(t-t0)/dur);el.textContent=Math.round((1-Math.pow(1-p,3))*to);if(p<1)requestAnimationFrame(step);})(performance.now());});
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('#view .ringfill').forEach(el=>{const o=el.getAttribute('data-off');if(o!=null)el.style.strokeDashoffset=o;})));
  }
  ({overview:pOverview, network:pNetwork, onboarding:pOnboarding, finance:pFinance, tasks:pTasks}[page]||pOverview)();
  enhance();

  /* mobile nav toggle */
  const tog=document.querySelector('.navtoggle');
  if(tog) tog.onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
};

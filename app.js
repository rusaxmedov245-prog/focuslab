// Data model
const DEFAULT_HABITS = ["Подъём в 05:00","Спортзал","Чтение / Обучение","Планирование дня","Ведение бюджета","Работа над проектом","Отказ от соцсетей","Дневник целей","Холодный душ"];
const CATEGORIES = ["Продукты","Транспорт","Жильё/коммуналка","Здоровье","Развлечения","Связь/интернет","Образование","Работа/проект","Другое"];
const state = { month:null, habits:DEFAULT_HABITS.slice(), marks:{}, finance:{}, goals:{}, planner:{} };
const STORAGE_KEY="focuslab_state_v3";
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){ const raw=localStorage.getItem(STORAGE_KEY); if(raw){ try{Object.assign(state, JSON.parse(raw));}catch(e){} } }
function daysInMonth(ym){ const [y,m]=ym.split("-").map(Number); return new Date(y,m,0).getDate(); }
function weekOfMonth(date){ const d=new Date(date); return Math.floor((d.getDate()-1)/7)+1; }
function yearWeek(date){ const d=new Date(date); const first=new Date(d.getFullYear(),0,1); const past=Math.floor((d-first)/86400000); return d.getFullYear()+"-"+Math.ceil((past+first.getDay()+1)/7); }
function fmtPct(x){ return Math.round((x||0)*100)+"%"; } function sum(a){ return a.reduce((x,y)=>x+(+y||0),0); } function avg(a){ return a.length?sum(a)/a.length:0; }

// Init
load(); if(!state.month){ state.month=new Date().toISOString().slice(0,7); }

// Tabs (bottom nav + keyboard)
function showTab(id){
  document.querySelectorAll('.tab').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  if(id==='today') setTimeout(renderToday,0);
}
document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));

// Export / Import / Reset
exportBtn.onclick=()=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"})); a.download="focuslab_backup.json"; a.click(); };
importFile.onchange=(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ Object.assign(state, JSON.parse(r.result)); save(); renderAll(); }; r.readAsText(f); };
resetBtn.onclick=()=>{ if(confirm("Очистить всё?")){ localStorage.removeItem(STORAGE_KEY); location.reload(); } };

// Habits
function ensureMonthMatrix(ym){ if(!state.marks[ym]){ const d=daysInMonth(ym); state.marks[ym]=state.habits.map(()=>Array(d).fill(0)); } else { const d=daysInMonth(ym); state.marks[ym].forEach(row=>{ if(row.length!==d){ row.length=d; row.fill(0,row.length,d); } }); } }
function renderHabits(){
  ensureMonthMatrix(state.month);
  const days=daysInMonth(state.month), grid=document.getElementById("habitsGrid");
  let html="<table class='habits-table'><thead><tr><th>Привычка</th>";
  for(let i=1;i<=days;i++) html+=`<th>${i}</th>`;
  html+="<th>% привычки</th></tr></thead><tbody>";
  state.habits.forEach((h,hi)=>{
    html+=`<tr><td>${h}</td>`;
    for(let di=0;di<days;di++){ const checked=state.marks[state.month][hi][di]?"checked":""; html+=`<td><input type="checkbox" data-hi="${hi}" data-di="${di}" ${checked}></td>`; }
    const p=avg(state.marks[state.month][hi]); html+=`<td><div class="progress"><div style="width:${p*100}%;background:${p>=0.8?"#34d399":p>=0.5?"#f59e0b":"#ef4444"}"></div></div></td></tr>`;
  });
  html+="<tr><td><b>% за день</b></td>";
  for(let di=0;di<days;di++){ const col=avg(state.marks[state.month].map(row=>row[di]||0)); html+=`<td>${fmtPct(col)}</td>`; }
  html+="<td></td></tr></tbody></table>";
  grid.innerHTML=html;
  grid.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{ const hi=+cb.dataset.hi, di=+cb.dataset.di; state.marks[state.month][hi][di]=cb.checked?1:0; save(); renderAll(); });
}

// KPI + charts data
function computeKPIs(){
  ensureMonthMatrix(state.month);
  const today=new Date(), ymToday=today.toISOString().slice(0,7), dIdx=today.getDate()-1, days=daysInMonth(state.month);
  const mat=state.marks[state.month], dayPct=(d)=>avg(mat.map(row=>row[d]||0));
  const todayPct=(state.month===ymToday&&dIdx<days)?dayPct(dIdx):0;
  const weekIdx=weekOfMonth(today), s=(weekIdx-1)*7, e=Math.min(weekIdx*7,days);
  const weekPct=avg(Array.from({length:e-s},(_,i)=>dayPct(s+i)));
  const monthPct=avg(mat.map(row=>avg(row)));
  const perHabit=mat.map(row=>avg(row));
  let best=0,worst=0; perHabit.forEach((v,i)=>{ if(v>perHabit[best]) best=i; if(v<perHabit[worst]) worst=i; });
  return {todayPct,weekPct,monthPct,best:state.habits[best],worst:state.habits[worst],perHabit,daySeries:Array.from({length:days},(_,i)=>dayPct(i))};
}

// Canvas helpers
function fitCanvasToParent(id,h=280){ const c=document.getElementById(id); const w=c.parentElement.clientWidth-32; c.width=Math.max(280,w); c.height=h; }
function drawDonut(c, vals, colors){ const ctx=c.getContext("2d"), W=c.width,H=c.height; ctx.clearRect(0,0,W,H); const cx=W/2,cy=H/2,r=Math.min(W,H)/2-20,inner=r*0.6,total=(vals.reduce((a,b)=>a+b,0)||1); let st=-Math.PI/2; vals.forEach((v,i)=>{ const a=(v/total)*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,st,st+a); ctx.closePath(); ctx.fillStyle=colors[i%colors.length]; ctx.fill(); st+=a; }); ctx.globalCompositeOperation="destination-out"; ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation="source-over"; }
function drawBars(c, vals){ const ctx=c.getContext("2d"), W=c.width,H=c.height; ctx.clearRect(0,0,W,H); const pad=40,bw=(W-2*pad)/vals.length*0.7; vals.forEach((v,i)=>{ const x=pad+(i+0.15)*(W-2*pad)/vals.length, h=(H-2*pad)*v; ctx.fillStyle=v>=0.8?"#34d399":v>=0.5?"#f59e0b":"#ef4444"; ctx.fillRect(x,H-pad-h,bw,h); }); ctx.strokeStyle="#aaa"; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.stroke(); }
function drawLine(c, vals){ const ctx=c.getContext("2d"), W=c.width,H=c.height; ctx.clearRect(0,0,W,H); const pad=40; ctx.strokeStyle="#2563eb"; ctx.lineWidth=2; ctx.beginPath(); vals.forEach((v,i)=>{ const x=pad+i*(W-2*pad)/Math.max(1,vals.length-1), y=H-pad-(H-2*pad)*v; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); ctx.strokeStyle="#aaa"; ctx.beginPath(); ctx.moveTo(pad,H-pad); ctx.lineTo(W-pad,H-pad); ctx.moveTo(pad,pad); ctx.lineTo(pad,H-pad); ctx.stroke(); }

// Finance
function renderFinance(){
  finCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
  const tbody=document.querySelector("#finTable tbody"), all=Object.values(state.finance).flat();
  tbody.innerHTML = all.map((r,i)=>`<tr><td>${r.date}</}</td><td>${r.cat}</td><td class="num">${(+r.amount).toFixed(2)}</td><td>${r.note||""}</td><td><button data-i="${i}" class="danger">×</button></td></tr>`).join("");
  tbody.querySelectorAll("button").forEach(btn=>btn.onclick=()=>{ let idx=+btn.dataset.i; for(const k of Object.keys(state.finance)){ if(idx<state.finance[k].length){ state.finance[k].splice(idx,1); break; } idx-=state.finance[k].length; } save(); renderAll(); });
  addFin.onclick=()=>{ const date=finDate.value||new Date().toISOString().slice(0,10), cat=finCat.value, amount=parseFloat(finAmount.value||"0"), note=finNote.value, key=yearWeek(date); if(!state.finance[key]) state.finance[key]=[]; state.finance[key].push({date,cat,amount,note}); save(); renderAll(); finAmount.value=""; finNote.value=""; };
}

// Planner
function ensurePlanner(ym){ if(!state.goals[ym]) state.goals[ym]=[]; if(!state.planner[ym]) state.planner[ym]=Array.from({length:5},()=>({focus:"",tasks:"",result:""})); }
function renderPlanner(){ ensurePlanner(state.month); const goalsDiv=document.getElementById("goalsList"); goalsDiv.innerHTML=state.goals[state.month].map((g,i)=>`<div class="goal"><input value="${g.text||""}" placeholder="Цель" data-i="${i}" data-f="text"><input value="${g.metric||""}" placeholder="Критерий/метрика" data-i="${i}" data-f="metric"><button class="danger" data-del="${i}">×</button></div>`).join(""); goalsDiv.querySelectorAll("input").forEach(inp=>inp.oninput=()=>{ const i=+inp.dataset.i,f=inp.dataset.f; state.goals[state.month][i][f]=inp.value; save(); }); goalsDiv.querySelectorAll("button[data-del]").forEach(btn=>btn.onclick=()=>{ const i=+btn.dataset.del; state.goals[state.month].splice(i,1); save(); renderPlanner(); }); addGoal.onclick=()=>{ state.goals[state.month].push({text:"",metric:""}); save(); renderPlanner(); };
  const tbody=document.querySelector("#plannerTable tbody"); tbody.innerHTML=state.planner[state.month].map((w,i)=>`<tr><td>Неделя ${i+1}</td><td contenteditable data-w="${i}" data-f="focus">${w.focus||""}</td><td contenteditable data-w="${i}" data-f="tasks">${w.tasks||""}</td><td contenteditable data-w="${i}" data-f="result">${w.result||""}</td></tr>`).join(""); tbody.querySelectorAll("[contenteditable]").forEach(c=>c.oninput=()=>{ const i=+c.dataset.w,f=c.dataset.f; state.planner[state.month][i][f]=c.textContent; save(); }); }

// TODAY quick
function renderToday(){
  if(!state.month) state.month=new Date().toISOString().slice(0,7);
  ensureMonthMatrix(state.month);
  const d=new Date(), ym=state.month, isCur=(ym===d.toISOString().slice(0,7)), di=d.getDate()-1;
  const wrap=document.getElementById("todayHabits"); let html="";
  state.habits.forEach((h,hi)=>{ const checked=isCur && state.marks[ym][hi][di] ? "checked":""; html+=`<div class="today-item"><span class="label">${h}</span><input type="checkbox" data-hi="${hi}" ${checked} ${isCur?"":"disabled"}></div>`; });
  wrap.innerHTML=html;
  wrap.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.onchange=()=>{ const hi=+cb.dataset.hi; state.marks[ym][hi][di]=cb.checked?1:0; save(); renderAll(); });
  // Quick expense
  qCat.innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
  qAdd.onclick=()=>{ const cat=qCat.value, amount=parseFloat(qAmount.value||"0"), date=new Date().toISOString().slice(0,10), key=yearWeek(date); if(!state.finance[key]) state.finance[key]=[]; state.finance[key].push({date,cat,amount,note:""}); save(); renderAll(); qAmount.value=""; };
  const todayKey=yearWeek(new Date().toISOString().slice(0,10)); const total=(state.finance[todayKey]||[]).filter(r=>r.date===new Date().toISOString().slice(0,10)).reduce((a,b)=>a+(+b.amount||0),0); qTotal.textContent=total.toFixed(0);
}

// Dashboard
function renderDashboard(){
  const {todayPct,weekPct,monthPct,best,worst,perHabit,daySeries}=computeKPIs();
  document.getElementById("kpiToday").textContent=fmtPct(todayPct);
  document.getElementById("kpiWeek").textContent=fmtPct(weekPct);
  document.getElementById("kpiMonth").textContent=fmtPct(monthPct);
  document.getElementById("kpiBest").textContent=best;
  document.getElementById("kpiWorst").textContent=worst;
  // Spend week
  const wkKey=yearWeek(new Date().toISOString().slice(0,10));
  const spend=sum((state.finance[wkKey]||[]).map(r=>+r.amount||0));
  document.getElementById("kpiSpendWeek").textContent=spend.toFixed(0);
  // Heat
  const tbody=document.querySelector("#tableHabitsHeat tbody");
  tbody.innerHTML=state.habits.map((h,i)=>{ const p=perHabit[i]||0; const col=p>=0.8?"#C8E6C9":p>=0.5?"#FFF9C4":"#FFCDD2"; return `<tr><td>${h}</td><td style="background:${col}">${fmtPct(p)}</td></tr>`; }).join("");
  // Charts
  fitCanvasToParent("chartDonut",280); fitCanvasToParent("chartBars",280); fitCanvasToParent("chartLine",280);
  const cats={}; (state.finance[wkKey]||[]).forEach(r=>{ cats[r.cat]=(cats[r.cat]||0)+(+r.amount||0); });
  const labels=Object.keys(cats), values=labels.map(k=>cats[k]);
  drawDonut(document.getElementById("chartDonut"), values.length?values:[1], ["#60a5fa","#fbbf24","#a78bfa","#f472b6","#fb923c","#34d399","#22d3ee","#93c5fd","#fca5a5"]);
  const dcount=daysInMonth(state.month);
  const weeks=[1,2,3,4,5].map(w=>{ const s=(w-1)*7, e=Math.min(w*7,dcount); const arr=[]; for(let i=s;i<e;i++) arr.push(daySeries[i]||0); return arr.length?avg(arr):0; });
  drawBars(document.getElementById("chartBars"), weeks);
  drawLine(document.getElementById("chartLine"), daySeries);
}

function renderAll(){ renderHabits(); renderFinance(); renderPlanner(); renderDashboard(); }
showTab('today'); renderAll();

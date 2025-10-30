// Ru_Focus v2 — minimal SPA logic + localStorage demo

const screens = {
  today: document.getElementById('screen-today'),
  tasks: document.getElementById('screen-tasks'),
  finance: document.getElementById('screen-finance'),
  habits: document.getElementById('screen-habits'),
  profile: document.getElementById('screen-profile'),
};

const bottomNav = document.querySelectorAll('.bn-item');
const sideNav = document.querySelectorAll('.menu-item');
const links = document.querySelectorAll('[data-route]');
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');

const amountInput = document.getElementById('amountInput');
const typeInput = document.getElementById('typeInput');
const catInput = document.getElementById('catInput');
const addTxnBtn = document.getElementById('addTxn');
const txnList = document.getElementById('txnList');
const balanceValue = document.getElementById('balanceValue');

const habitInput = document.getElementById('habitInput');
const addHabitBtn = document.getElementById('addHabit');
const habitList = document.getElementById('habitList');

const installBtn = document.getElementById('installBtn');

function activate(route) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[route].classList.add('active');

  [...bottomNav, ...sideNav].forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[data-route="${route}"]`).forEach(el => el.classList.add('active'));

  localStorage.setItem('ru_focus_last_route', route);
}
links.forEach(el => el.addEventListener('click', (e) => {
  const r = el.getAttribute('data-route');
  if (r) { e.preventDefault(); activate(r); }
}));
bottomNav.forEach(el => el.addEventListener('click', () => activate(el.getAttribute('data-route'))));
sideNav.forEach(el => el.addEventListener('click', () => activate(el.getAttribute('data-route'))));

activate(localStorage.getItem('ru_focus_last_route') || 'today');

// Tasks
const TASKS_KEY = 'ru_focus_tasks';
function getTasks() { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); }
function setTasks(arr){ localStorage.setItem(TASKS_KEY, JSON.stringify(arr)); renderTasks(); }

function renderTasks(filter='all'){
  const tasks = getTasks();
  const now = new Date().toISOString().slice(0,10);
  const filtered = tasks.filter(t => {
    if (filter === 'today') return (t.dueDate || now) === now;
    if (filter === 'open') return !t.done;
    return true;
  });
  taskList.innerHTML = '';
  filtered.forEach(t => {
    const li = document.createElement('li');
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!t.done;
    cb.addEventListener('change', () => {
      t.done = cb.checked;
      setTasks(tasks);
    });
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.title;
    const del = document.createElement('button');
    del.className = 'btn ghost'; del.textContent = 'Удалить';
    del.addEventListener('click', () => setTasks(tasks.filter(x => x.id !== t.id)));
    li.append(cb, title, del);
    taskList.appendChild(li);
  });
}

taskInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && taskInput.value.trim()) {
    const tasks = getTasks();
    tasks.unshift({ id: 't' + Date.now(), title: taskInput.value.trim(), done: false, dueDate: new Date().toISOString().slice(0,10) });
    setTasks(tasks);
    taskInput.value='';
  }
});

document.querySelectorAll('[data-filter]').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    renderTasks(chip.getAttribute('data-filter'));
  });
});

renderTasks();

// Finance
const TXN_KEY = 'ru_focus_txn';
function getTxns(){ return JSON.parse(localStorage.getItem(TXN_KEY) || '[]'); }
function setTxns(arr){ localStorage.setItem(TXN_KEY, JSON.stringify(arr)); renderTxns(); }

function renderTxns(){
  const txns = getTxns();
  txnList.innerHTML = '';
  let bal = 0;
  txns.forEach(x => {
    bal += x.type === 'income' ? x.amount : -x.amount;
    const li = document.createElement('li');
    const t = document.createElement('div');
    t.className='title';
    t.textContent = `${x.type === 'income' ? '+' : '-'}${x.amount} • ${x.category} • ${x.date}`;
    const del = document.createElement('button');
    del.className='btn ghost'; del.textContent='Удалить';
    del.addEventListener('click', () => setTxns(txns.filter(y => y.id !== x.id)));
    li.append(t, del);
    txnList.appendChild(li);
  });
  balanceValue.textContent = `${bal} ₽`;
}
renderTxns();

addTxnBtn?.addEventListener('click', () => {
  const amount = parseFloat(amountInput.value || '0');
  if (!amount) return;
  const type = typeInput.value;
  const cat = catInput.value.trim() || (type==='income'?'доход':'прочее');
  const date = new Date().toISOString().slice(0,10);
  const txns = getTxns();
  txns.unshift({ id: 'f' + Date.now(), type, amount, category: cat, date });
  setTxns(txns);
  amountInput.value=''; catInput.value='';
});

// Habits
const HABITS_KEY = 'ru_focus_habits';
function getHabits(){ return JSON.parse(localStorage.getItem(HABITS_KEY) || '[]'); }
function setHabits(arr){ localStorage.setItem(HABITS_KEY, JSON.stringify(arr)); renderHabits(); }

function renderHabits(){
  const habits = getHabits();
  habitList.innerHTML = '';
  const today = new Date().toISOString().slice(0,10);
  habits.forEach(h => {
    const li = document.createElement('li');
    const t = document.createElement('div');
    t.className='title';
    t.textContent = h.title;
    const done = document.createElement('button');
    done.className='btn'; done.textContent = h.progress?.includes(today) ? 'Готово ✓' : 'Сделано';
    done.addEventListener('click', () => {
      h.progress = h.progress || [];
      if (!h.progress.includes(today)) h.progress.push(today);
      setHabits(habits);
    });
    const del = document.createElement('button');
    del.className='btn ghost'; del.textContent='Удалить';
    del.addEventListener('click', () => setHabits(habits.filter(x => x.id !== h.id)));
    li.append(t, done, del);
    habitList.appendChild(li);
  });
}
renderHabits();

addHabitBtn?.addEventListener('click', () => {
  if (!habitInput.value.trim()) return;
  const habits = getHabits();
  habits.unshift({ id: 'h' + Date.now(), title: habitInput.value.trim(), progress: [] });
  setHabits(habits);
  habitInput.value='';
});

document.getElementById('toggleTheme')?.addEventListener('click', () => {
  localStorage.removeItem(TASKS_KEY);
  localStorage.removeItem(TXN_KEY);
  localStorage.removeItem(HABITS_KEY);
  location.reload();
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installBtn.hidden = true;
});

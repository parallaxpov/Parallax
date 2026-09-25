// terminal.js — the site terminal, docked bottom-left (button or the ~ key).
// One engine, two profiles: GUEST_TERMINAL in the portfolio, POST_CONSOLE
// once the lair is open (index.html fires `lair:open`). Each profile has its
// own look, prompt and commands; later also its own AI context (SAI) and,
// with self-hosting, an admin profile behind a real login — see PLAN.md.
// Everything here is public client-side code: profiles are UX, not access
// control.

const $ = id => document.getElementById(id);
const panel = $('termPanel'), launch = $('termLaunch'), out = $('termOut'), input = $('termIn');

const PROFILES = {
  guest: { title: 'GUEST_TERMINAL', prompt: 'guest@parallax:~$',
           cmds: ['help', 'whoami', 'about', 'projects', 'skills', 'contacts', 'lang', 'fx', 'date', 'clear'] },
  post:  { title: 'POST_CONSOLE',   prompt: 'guest@lair:~$',
           cmds: ['help', 'whoami', 'about', 'ls', 'open', 'contacts', 'sai', 'lang', 'fx', 'date', 'clear'] },
};
const ROOM_NAMES = ['blindspot', 'workshop', 'render'];

// Hidden commands: not in help, not in Tab completion. Found somewhere on
// the site → typed here → a small reward. Add a line to add a secret.
const SECRETS = [
  { code: 'parallax --reveal', where: { ru: 'исходный код страницы', en: 'page source' } },
];

const TEXT = {
  ru: {
    hello: {
      guest: 'GUEST_TERMINAL v0.1 · портфолио PARALLAX\nВведите <acc>help</acc>, чтобы увидеть команды. <dim>~ — открыть/закрыть</dim>',
      post:  'POST_CONSOLE v0.1 · пост наблюдения\nВведите <acc>help</acc>, чтобы увидеть команды.',
    },
    help: {
      guest: 'Доступные команды:\n  <acc>help</acc>      — этот список\n  <acc>whoami</acc>    — кто вы здесь\n  <acc>about</acc>     — кто такой PARALLAX\n  <acc>projects</acc>  — к проектам\n  <acc>skills</acc>    — к навыкам\n  <acc>contacts</acc>  — к контактам\n  <acc>lang</acc>      — RU / EN\n  <acc>fx</acc>        — эффекты вкл/выкл\n  <acc>date</acc>      — текущее время\n  <acc>clear</acc>     — очистить экран',
      post:  'Доступные команды:\n  <acc>help</acc>            — этот список\n  <acc>whoami</acc>          — кто вы здесь\n  <acc>about</acc>           — что это за место\n  <acc>ls</acc>              — комнаты и камеры\n  <acc>open</acc> <dim>&lt;комната&gt;</dim>  — войти в комнату (например, open blindspot)\n  <acc>contacts</acc>        — шторка контактов\n  <acc>sai</acc>             — связь с SAI\n  <acc>lang</acc>            — RU / EN\n  <acc>fx</acc>              — эффекты вкл/выкл\n  <acc>date</acc>            — время поста\n  <acc>clear</acc>           — очистить экран',
    },
    whoami: {
      guest: 'guest\n<dim>Посетитель портфолио.</dim>',
      post:  'guest\n<dim>Гостевой доступ: только наблюдение. Личные архивы закрыты.</dim>',
    },
    about: {
      guest: 'PARALLAX — исследователь на пересечении ИБ, ИИ и психологии.\n<dim>Исследую то, что другие предпочитают не замечать.</dim>',
      post:  'Логово PARALLAX — личное место за витриной портфолио.\nЗдесь копятся проекты, идеи, видение, записи и логи,\nчтобы со временем перечитывать и сравнивать.\n<dim>Исследую то, что другие предпочитают не замечать.</dim>',
    },
    goto: s => `→ <acc>${s}</acc>`,
    drawer: '→ шторка контактов',
    lang: 'Язык: русский',
    fx: on => `Эффекты: ${on ? '<ok>ON</ok>' : '<err>OFF</err>'}`,
    ls: '0x01 <acc>blindspot</acc> <ok>[OPEN]</ok>    лаборатория исследований\n0x02 <acc>workshop</acc>  <dim>[PENDING]</dim> мастерская робототехника\n0x03 <acc>render</acc>    <dim>[PENDING]</dim> пространство 3D-художника',
    openUsage: 'Использование: open &lt;комната&gt;. Список — <acc>ls</acc>.',
    opening: r => `Подключение к ${r}…`,
    pending: r => `<err>${r}: доступ ещё не выдан.</err>`,
    noRoom: r => `<err>${r}: такой комнаты нет.</err> Список — <acc>ls</acc>.`,
    booting: '<dim>Пост ещё загружается, повторите через секунду.</dim>',
    sai: '<dim>SAI: канал не установлен.</dim>\nМодуль ещё не подключён к посту — появится вместе с собственным хостингом.',
    sudo: '<err>guest is not in the sudoers file. This incident will be reported.</err>',
    secret: w => `<ok>Congratulations! You found a secret!</ok>\n<dim>найдено: ${w}</dim>`,
    lost: '<err>!! connection lost</err>\n<dim>переключение канала…</dim>',
    unknown: c => `<err>${c}: команда не найдена.</err> Попробуйте <acc>help</acc>.`,
  },
  en: {
    hello: {
      guest: 'GUEST_TERMINAL v0.1 · PARALLAX portfolio\nType <acc>help</acc> to see the commands. <dim>~ — open/close</dim>',
      post:  'POST_CONSOLE v0.1 · observation post\nType <acc>help</acc> to see the commands.',
    },
    help: {
      guest: 'Available commands:\n  <acc>help</acc>      — this list\n  <acc>whoami</acc>    — who you are here\n  <acc>about</acc>     — who PARALLAX is\n  <acc>projects</acc>  — go to projects\n  <acc>skills</acc>    — go to skills\n  <acc>contacts</acc>  — go to contacts\n  <acc>lang</acc>      — RU / EN\n  <acc>fx</acc>        — effects on/off\n  <acc>date</acc>      — current time\n  <acc>clear</acc>     — clear the screen',
      post:  'Available commands:\n  <acc>help</acc>            — this list\n  <acc>whoami</acc>          — who you are here\n  <acc>about</acc>           — what this place is\n  <acc>ls</acc>              — rooms and cameras\n  <acc>open</acc> <dim>&lt;room&gt;</dim>     — enter a room (e.g. open blindspot)\n  <acc>contacts</acc>        — contacts drawer\n  <acc>sai</acc>             — link to SAI\n  <acc>lang</acc>            — RU / EN\n  <acc>fx</acc>              — effects on/off\n  <acc>date</acc>            — post time\n  <acc>clear</acc>           — clear the screen',
    },
    whoami: {
      guest: 'guest\n<dim>Portfolio visitor.</dim>',
      post:  'guest\n<dim>Guest access: observation only. Personal archives are locked.</dim>',
    },
    about: {
      guest: 'PARALLAX — researcher at the intersection of InfoSec, AI & Psychology.\n<dim>I research what others prefer not to notice.</dim>',
      post:  "PARALLAX's lair — a personal place behind the portfolio.\nProjects, ideas, vision, notes and logs pile up here,\nto be re-read and compared over time.\n<dim>I research what others prefer not to notice.</dim>",
    },
    goto: s => `→ <acc>${s}</acc>`,
    drawer: '→ contacts drawer',
    lang: 'Language: English',
    fx: on => `Effects: ${on ? '<ok>ON</ok>' : '<err>OFF</err>'}`,
    ls: '0x01 <acc>blindspot</acc> <ok>[OPEN]</ok>    research lab\n0x02 <acc>workshop</acc>  <dim>[PENDING]</dim> robotics workshop\n0x03 <acc>render</acc>    <dim>[PENDING]</dim> 3D artist space',
    openUsage: 'Usage: open &lt;room&gt;. See <acc>ls</acc>.',
    opening: r => `Connecting to ${r}…`,
    pending: r => `<err>${r}: access not granted yet.</err>`,
    noRoom: r => `<err>${r}: no such room.</err> See <acc>ls</acc>.`,
    booting: '<dim>The post is still booting, try again in a second.</dim>',
    sai: '<dim>SAI: no link established.</dim>\nThe module is not wired to the post yet — it comes with self-hosting.',
    sudo: '<err>guest is not in the sudoers file. This incident will be reported.</err>',
    secret: w => `<ok>Congratulations! You found a secret!</ok>\n<dim>found in: ${w}</dim>`,
    lost: '<err>!! connection lost</err>\n<dim>switching channel…</dim>',
    unknown: c => `<err>${c}: command not found.</err> Try <acc>help</acc>.`,
  },
};

let profile = 'guest';
let lairApi = null;          // set by lair.js once the lair is mounted
const cmdHistory = [];
let hIdx = 0;

const siteLang = () => { try{ return (typeof lang !== 'undefined' && TEXT[lang]) ? lang : 'ru'; }catch(e){ return 'ru'; } };
const t = () => TEXT[siteLang()];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// tiny markup for answers: <acc>, <dim>, <ok>, <err> → styled spans
const markup = s => s.replace(/<(acc|dim|ok|err)>/g, '<span class="t-$1">').replace(/<\/(acc|dim|ok|err)>/g, '</span>');

function print(html){
  const div = document.createElement('div');
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}
const say = s => print(markup(s));
const perProfile = v => (v && typeof v === 'object') ? v[profile] : v;

function applyProfile(){
  const p = PROFILES[profile];
  panel.dataset.profile = launch.dataset.profile = profile;
  $('termTitle').textContent = p.title + ' · tty0';
  $('termPrompt').textContent = p.prompt;
  $('termLaunchLabel').textContent = p.title;
  out.innerHTML = '';
  say(perProfile(t().hello));
}

function setOpen(open){
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  launch.setAttribute('aria-expanded', open ? 'true' : 'false');
  if(open){ launch.classList.remove('is-pulse'); setTimeout(() => input.focus({preventScroll: true}), 30); }
  else if(document.activeElement === input) input.blur();
}
const isOpen = () => panel.classList.contains('is-open');

function run(raw){
  const line = raw.trim();
  print(`<span class="t-cmd"><b>${esc(PROFILES[profile].prompt)}</b> ${esc(line)}</span>`);
  if(!line) return;
  cmdHistory.push(line); hIdx = cmdHistory.length;
  const T_ = t();

  const secret = SECRETS.find(s => s.code === line.toLowerCase().replace(/\s+/g, ' '));
  if(secret){ say(T_.secret(secret.where[siteLang()] || secret.where.en)); celebrate(); return; }

  const [cmdRaw, ...args] = line.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  if(cmd === 'sudo'){ say(T_.sudo); return; }
  if(!PROFILES[profile].cmds.includes(cmd) && !(cmd === 'cd' && profile === 'post') && cmd !== '?' && cmd !== 'cls'){
    say(T_.unknown(esc(cmdRaw))); return;
  }
  const scrollTo = id => { const el = $(id); if(el) el.scrollIntoView({behavior: 'smooth'}); say(T_.goto('#' + id)); };
  switch(cmd){
    case 'help': case '?': say(perProfile(T_.help)); break;
    case 'whoami': say(perProfile(T_.whoami)); break;
    case 'about': say(perProfile(T_.about)); break;
    case 'projects': scrollTo('projects'); break;
    case 'skills': scrollTo('skills'); break;
    case 'contacts':
      if(profile === 'guest') scrollTo('contacts');
      else { const a = document.querySelector('nav a[href="#contacts"]'); if(a) a.click(); say(T_.drawer); }
      break;
    case 'lang': { const b = $('langToggle'); if(b) b.click(); say(t().lang); break; }
    case 'fx': { const b = $('fxToggle'); if(b) b.click(); say(T_.fx(!document.body.classList.contains('fx-off'))); break; }
    case 'date': print(esc(new Date().toString())); break;
    case 'clear': case 'cls': out.innerHTML = ''; break;
    case 'ls': say(T_.ls); break;
    case 'sai': say(T_.sai); break;
    case 'open': case 'cd': {
      const r = (args[0] || '').toLowerCase();
      if(!r){ say(T_.openUsage); break; }
      if(!lairApi){ say(T_.booting); break; }
      if(lairApi.hasRoom(r)){ say(T_.opening(esc(r))); setTimeout(() => { setOpen(false); lairApi.enter(r); }, 350); }
      else if(ROOM_NAMES.includes(r)){ say(T_.pending(esc(r))); lairApi.deny(ROOM_NAMES.indexOf(r)); }
      else say(T_.noRoom(esc(r)));
      break;
    }
  }
}

// Reward hook for found secrets. Sound + confetti come later (PLAN.md).
function celebrate(){
  panel.classList.remove('is-reward'); void panel.offsetWidth; panel.classList.add('is-reward');
}

input.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); run(input.value); input.value = ''; }
  else if(e.key === 'ArrowUp'){ if(hIdx > 0){ hIdx--; input.value = cmdHistory[hIdx]; } e.preventDefault(); }
  else if(e.key === 'ArrowDown'){ if(hIdx < cmdHistory.length){ hIdx++; input.value = cmdHistory[hIdx] || ''; } e.preventDefault(); }
  else if(e.key === 'Tab'){
    // complete a command, or a room name after open/cd (never a secret)
    e.preventDefault();
    const parts = input.value.split(/\s+/);
    const pool = parts.length > 1 ? (profile === 'post' ? ROOM_NAMES : []) : PROFILES[profile].cmds;
    const last = parts[parts.length - 1].toLowerCase();
    const hits = pool.filter(x => x.startsWith(last));
    if(hits.length === 1){ parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + (parts.length === 1 ? ' ' : ''); }
    else if(hits.length > 1) print(`<span class="t-dim">${hits.join('  ')}</span>`);
  }
  else if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); setOpen(false); launch.focus({preventScroll: true}); }
});

launch.addEventListener('click', () => setOpen(!isOpen()));
$('termClose').addEventListener('click', () => { setOpen(false); launch.focus({preventScroll: true}); });
panel.addEventListener('mousedown', e => { if(e.target === panel || e.target === out) setTimeout(() => input.focus({preventScroll: true}), 0); });

// ~ / ` (the key left of 1, whatever the layout) opens and closes the
// terminal — unless the viewer is typing somewhere else.
document.addEventListener('keydown', e => {
  if(e.code !== 'Backquote' || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = document.activeElement;
  const typing = el && el !== input && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  if(typing) return;
  e.preventDefault();
  setOpen(!isOpen());
});

// The lair opens → the terminal becomes the post console. If it's open,
// the handover plays out on screen; if not, the launcher changes and
// blinks once to show something changed.
document.addEventListener('lair:open', () => {
  if(profile === 'post') return;
  if(isOpen()){
    say(t().lost);
    panel.classList.add('is-switching');
    setTimeout(() => { profile = 'post'; applyProfile(); panel.classList.remove('is-switching'); }, 700);
  } else {
    profile = 'post'; applyProfile();
    launch.classList.add('is-pulse');
  }
});

export function setLairApi(api){ lairApi = api; }

applyProfile();
if(document.body.classList.contains('lair-open')){ profile = 'post'; applyProfile(); }

// A breadcrumb for the curious (DevTools). The actual secret sits in the
// page source.
console.log('%c// PARALLAX', 'color:#00e5cc;font:700 13px monospace');
console.log('%cТерминал знает больше, чем показывает help. Загляни в исходный код страницы.\nThe terminal knows more than help shows. Have a look at the page source.', 'color:#7c3aed;font:12px monospace');

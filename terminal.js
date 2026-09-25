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
    linkUsage: 'link — связь с бэкендом на вашем ПК.\n  <acc>link</acc>            — проверить связь\n  <acc>link</acc> <dim>&lt;адрес&gt;</dim>    — задать адрес (по умолчанию http://127.0.0.1:8787)\n  <acc>link off</acc>        — забыть адрес\n<dim>Адрес хранится только в этом браузере.</dim>',
    linkChecking: u => `<dim>проверка ${u}…</dim>`,
    linkOn: (u, v) => `<ok>link established</ok> · ${u}\n<dim>parallax-lair ${v}</dim>`,
    linkOffline: u => `<err>link offline</err> · ${u}\n<dim>Бэкенд не отвечает: запущен ли start-lair.bat? Браузер мог спросить разрешение на доступ к устройствам — его нужно дать.</dim>`,
    linkForgot: '<dim>адрес забыт, проверка связи отключена</dim>',
    linkBad: '<err>адрес должен начинаться с http:// или https://</err>',
    saiOnline: v => `<ok>link established</ok> · parallax-lair ${v}\n<dim>SAI: модуль ещё не установлен на сервере.</dim>`,
    saiReady: m => `<ok>SAI online</ok> · модель ${m}\n<dim>Режим разговора: пишите вопросы. <acc>exit</acc> или Esc — выйти, <acc>reset</acc> — забыть разговор.</dim>`,
    saiNoModel: (m, list) => `<err>модель ${m} не найдена в Ollama.</err>\n<dim>Установленные: ${list || '—'}. Укажите имя в SAI_MODEL (.env бэкенда) и перезапустите.</dim>`,
    saiModelOffline: '<err>Ollama не отвечает.</err> <dim>Запущена ли Ollama на ПК?</dim>',
    saiOldBackend: '<err>бэкенд без модуля SAI</err> <dim>— обновите parallax-backend и перезапустите start-lair.bat.</dim>',
    saiExit: '<dim>разговор с SAI завершён</dim>',
    saiReset: '<dim>SAI: разговор забыт</dim>',
    saiAborted: '<dim>[ответ прерван]</dim>',
    saiTooLong: (n, max) => `<err>SAI: слишком длинное сообщение — ${n} / ${max} символов.</err> <dim>Разбейте на части.</dim>`,
    actLang: l => `<ok>✓ язык: ${l === 'en' ? 'English' : 'русский'}</ok>`,
    actFx: on => `<ok>✓ эффекты: ${on ? 'ON' : 'OFF'}</ok>`,
    actGoto: s => `<ok>✓ → #${s}</ok>`,
    actContacts: '<ok>✓ контакты</ok>',
    actRoom: r => `<ok>✓ открываю ${r}</ok>`,
    actDenied: r => `<err>✗ ${r}: доступ ещё не выдан</err>`,
    actFailed: a => `<err>✗ действие не выполнено: ${a}</err>`,
    saiError: m => `<err>SAI: ${m}</err>`,
    loginUser: 'имя пользователя:',
    loginPass: 'пароль:',
    loginAuth: 'аутентификация…',
    loginOffline: '<err>auth server offline</err>\n<dim>Сервер авторизации появится вместе с собственным хостингом. Введённые данные никуда не отправлялись.</dim>',
    loginCancel: '<dim>вход отменён</dim>',
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
    linkUsage: 'link — connection to the backend on your PC.\n  <acc>link</acc>            — check the link\n  <acc>link</acc> <dim>&lt;address&gt;</dim>  — set the address (default http://127.0.0.1:8787)\n  <acc>link off</acc>        — forget the address\n<dim>The address is kept in this browser only.</dim>',
    linkChecking: u => `<dim>checking ${u}…</dim>`,
    linkOn: (u, v) => `<ok>link established</ok> · ${u}\n<dim>parallax-lair ${v}</dim>`,
    linkOffline: u => `<err>link offline</err> · ${u}\n<dim>The backend doesn't answer: is start-lair.bat running? The browser may have asked for permission to access devices — it has to be allowed.</dim>`,
    linkForgot: '<dim>address forgotten, link checks off</dim>',
    linkBad: '<err>the address must start with http:// or https://</err>',
    saiOnline: v => `<ok>link established</ok> · parallax-lair ${v}\n<dim>SAI: the module is not installed on the server yet.</dim>`,
    saiReady: m => `<ok>SAI online</ok> · model ${m}\n<dim>Chat mode: type your questions. <acc>exit</acc> or Esc — leave, <acc>reset</acc> — forget the conversation.</dim>`,
    saiNoModel: (m, list) => `<err>model ${m} not found in Ollama.</err>\n<dim>Installed: ${list || '—'}. Set the name in SAI_MODEL (backend .env) and restart.</dim>`,
    saiModelOffline: '<err>Ollama is not answering.</err> <dim>Is Ollama running on the PC?</dim>',
    saiOldBackend: '<err>backend without the SAI module</err> <dim>— update parallax-backend and restart start-lair.bat.</dim>',
    saiExit: '<dim>left the SAI conversation</dim>',
    saiReset: '<dim>SAI: conversation forgotten</dim>',
    saiAborted: '<dim>[answer interrupted]</dim>',
    saiTooLong: (n, max) => `<err>SAI: message too long — ${n} / ${max} characters.</err> <dim>Split it into parts.</dim>`,
    actLang: l => `<ok>✓ language: ${l === 'en' ? 'English' : 'Russian'}</ok>`,
    actFx: on => `<ok>✓ effects: ${on ? 'ON' : 'OFF'}</ok>`,
    actGoto: s => `<ok>✓ → #${s}</ok>`,
    actContacts: '<ok>✓ contacts</ok>',
    actRoom: r => `<ok>✓ opening ${r}</ok>`,
    actDenied: r => `<err>✗ ${r}: access not granted yet</err>`,
    actFailed: a => `<err>✗ action not done: ${a}</err>`,
    saiError: m => `<err>SAI: ${m}</err>`,
    loginUser: 'username:',
    loginPass: 'password:',
    loginAuth: 'authenticating…',
    loginOffline: '<err>auth server offline</err>\n<dim>The auth server comes with self-hosting. Nothing you typed was sent anywhere.</dim>',
    loginCancel: '<dim>login cancelled</dim>',
    secret: w => `<ok>Congratulations! You found a secret!</ok>\n<dim>found in: ${w}</dim>`,
    lost: '<err>!! connection lost</err>\n<dim>switching channel…</dim>',
    unknown: c => `<err>${c}: command not found.</err> Try <acc>help</acc>.`,
  },
};

let profile = 'guest';
let lairApi = null;          // set by lair.js once the lair is mounted
const cmdHistory = [];
let hIdx = 0;
// login (stub): while a prompt is active, Enter feeds it instead of run().
// Nothing is checked or sent — there is no auth server on static hosting,
// and a client-side check would only be fake security. See PLAN.md.
let loginStep = null, loginUser = '';

// link: the owner's own backend (parallax-backend) on their PC. The address
// lives only in this browser (localStorage), never in the public code, and
// nothing is probed until the owner has run `link` once — so visitors'
// browsers never try to reach anything on their own machines.
const LINK_KEY = 'prx-link', LINK_DEFAULT = 'http://127.0.0.1:8787';
const linkGet = () => { try{ return localStorage.getItem(LINK_KEY); }catch(e){ return null; } };
const linkSet = v => { try{ v ? localStorage.setItem(LINK_KEY, v) : localStorage.removeItem(LINK_KEY); }catch(e){} };
let linkState = null; // null = not configured, else {ok, version}

// SAI chat (POST_CONSOLE): talks to the owner's backend, which streams the
// local model's answer. The conversation lives in this tab only.
let saiMode = false, saiBusy = null; // saiBusy = AbortController while answering
const saiHistory = [];
const SAI_KEEP = 20;
// Mirrors the backend limits: the new message is checked here before it is
// sent (no model call for junk); old answers are cut before they go back
// into the history, so one huge answer can't jam the conversation.
const SAI_USER_MAX = 2000, SAI_ANSWER_KEEP = 4000;
function saiTooLong(text){
  if(text.length <= SAI_USER_MAX) return false;
  say(t().saiTooLong(text.length, SAI_USER_MAX));
  return true;
}

async function saiCheck(){
  const url = linkGet();
  const st = await probeLink();
  if(!st || !st.ok){ say(t().linkOffline(esc(url))); return false; }
  try{
    const r = await fetch(url + '/sai/status', {cache: 'no-store'});
    if(r.status === 404){ say(t().saiOldBackend); return false; }
    const j = await r.json();
    if(!j.online){ say(t().saiModelOffline); return false; }
    if(!j.installed){ say(t().saiNoModel(esc(j.model), esc((j.available || []).join(', ')))); return false; }
    return j.model;
  }catch(e){ say(t().linkOffline(esc(url))); return false; }
}

function saiPrompt(on){
  saiMode = on;
  $('termPrompt').textContent = on ? 'sai>' : PROFILES[profile].prompt;
}

// SAI's actions arrive inside the answer stream between \x1e markers (see
// parallax-backend sai.py). Only what's listed here can happen; the
// confirmation is printed by the site itself, so "✓" always means it really
// happened — never the model's word for it.
const SAI_MARK = '\x1e';
// What's on screen right now, sent with every message: the backend decides
// toggles and "already open" from it, and the model is told to trust it over
// the chat history (the user may have clicked things themselves).
function siteState(){
  const cur = (() => { try{ return lang; }catch(e){ return 'ru'; } })();
  const roomOpen = document.documentElement.classList.contains('room-open');
  return {
    lang: cur === 'en' ? 'en' : 'ru',
    fx: !document.body.classList.contains('fx-off'),
    drawer: !!document.querySelector('.contacts-drawer.is-open'),
    room: roomOpen ? location.hash.slice(1) : null,
    lair: document.body.classList.contains('lair-open'),
  };
}
const SAI_SECTIONS = ['about', 'projects', 'focus', 'skills', 'publications', 'lair'];
function saiAction(a){
  const args = (a && a.args) || {};
  const curLang = (() => { try{ return lang; }catch(e){ return 'ru'; } })();
  switch(a && a.action){
    case 'set_language': {
      if(args.lang !== 'ru' && args.lang !== 'en') break;
      if(args.lang !== curLang){ const b = $('langToggle'); if(b) b.click(); }
      say(t().actLang(args.lang)); return `language=${args.lang}`;
    }
    case 'set_effects': {
      const on = !!args.on, isOn = !document.body.classList.contains('fx-off');
      if(on !== isOn){ const b = $('fxToggle'); if(b) b.click(); }
      say(t().actFx(on)); return `effects=${on ? 'on' : 'off'}`;
    }
    case 'go_to': {
      const el = SAI_SECTIONS.includes(args.section) && $(args.section);
      if(!el || el.hidden) break;
      el.scrollIntoView({behavior: 'smooth'}); say(t().actGoto(esc(args.section))); return `go_to=${args.section}`;
    }
    case 'run_command': {
      const cmd = String(args.command || '');
      if(!['help', 'ls', 'whoami', 'about', 'date'].includes(cmd)) break;
      run(cmd); return `command ${cmd}`;
    }
    case 'open_contacts': {
      const link = document.querySelector('nav a[href="#contacts"]');
      if(!link) break;
      link.click(); say(t().actContacts); return 'contacts';
    }
    case 'open_room': {
      const r = String(args.room || '');
      if(!lairApi || !ROOM_NAMES.includes(r)) break;
      if(lairApi.hasRoom(r)){ say(t().actRoom(esc(r))); setTimeout(() => lairApi.enter(r), 400); return `open_room=${r}`; }
      lairApi.deny(ROOM_NAMES.indexOf(r)); say(t().actDenied(esc(r))); return `room ${r} denied`;
    }
  }
  say(t().actFailed(esc(String((a && a.action) || '?'))));
  return null;
}

async function saiAsk(text){
  saiHistory.push({role: 'user', content: text});
  while(saiHistory.length > SAI_KEEP) saiHistory.shift();
  const div = document.createElement('div');
  div.className = 't-sai is-wait';
  div.textContent = '…';
  out.appendChild(div); out.scrollTop = out.scrollHeight;
  const ctrl = new AbortController();
  saiBusy = ctrl;
  let answer = '', raw = '', ran = 0;
  const did = [];
  try{
    const r = await fetch(linkGet() + '/sai/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({messages: saiHistory, state: siteState()}), signal: ctrl.signal,
    });
    if(!r.ok){
      let msg = 'HTTP ' + r.status;
      try{
        const d = (await r.json()).detail;
        if(typeof d === 'string') msg = d;
        else if(Array.isArray(d) && d.length) msg = d.map(x => x.msg || JSON.stringify(x)).join('; ');
      }catch(e){}
      div.remove(); saiHistory.pop(); say(t().saiError(esc(String(msg)))); return;
    }
    const reader = r.body.getReader(), dec = new TextDecoder();
    div.classList.remove('is-wait'); div.textContent = '';
    for(;;){
      const {value, done} = await reader.read();
      if(done) break;
      raw += dec.decode(value, {stream: true});
      const parts = raw.split(SAI_MARK);
      answer = parts.filter((_, i) => i % 2 === 0).join('')
        .replace(/\[(?:выполнено сайтом|done by the site)[^\]]*\]/gi, '');  // old habit, never shown
      div.innerHTML = mdLite(answer.replace(/^\s+/, ''));
      // run each action once, as soon as its closing marker has arrived
      for(let i = 1; i < parts.length - 1; i += 2){
        const n = (i + 1) / 2;
        if(n <= ran) continue;
        ran = n;
        let act = null;
        try{ act = JSON.parse(parts[i]); }catch(e){}
        const res = saiAction(act);
        if(res) did.push(res);
      }
      out.scrollTop = out.scrollHeight;
    }
    answer = answer.trim();
    if(!answer && did.length){ div.remove(); }
    // (what the site actually did reaches the model through siteState() on
    // the next message — no service notes in the history: the model copied
    // them as text)
    if(answer) saiHistory.push({role: 'assistant', content: answer.length > SAI_ANSWER_KEEP ? answer.slice(0, SAI_ANSWER_KEEP) + ' …' : answer});
    else saiHistory.pop();
  }catch(e){
    if(ctrl.signal.aborted){ if(!answer) div.remove(); say(t().saiAborted); saiHistory.pop(); }
    else { div.remove(); saiHistory.pop(); say(t().saiError(esc(e.message || 'network error'))); }
  }finally{
    saiBusy = null;
  }
}

async function runSai(arg){
  if(!linkGet()){ say(t().sai); return; }
  const model = await saiCheck();
  if(!model) return;
  if(arg){ if(!saiTooLong(arg)) await saiAsk(arg); return; }
  say(t().saiReady(esc(model)));
  saiPrompt(true);
}
async function probeLink(){
  const url = linkGet();
  const dot = $('termLink');
  if(!url){ linkState = null; dot.hidden = true; return null; }
  dot.hidden = false; dot.className = 'term-link is-wait';
  try{
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(url + '/health', {cache: 'no-store', signal: ctrl.signal});
    clearTimeout(tm);
    const j = await r.json();
    linkState = {ok: r.ok && j.status === 'online', version: j.version || '?'};
  }catch(e){ linkState = {ok: false}; }
  dot.className = 'term-link ' + (linkState.ok ? 'is-on' : 'is-off');
  dot.title = linkState.ok ? 'link established' : 'link offline';
  return linkState;
}

const siteLang = () => { try{ return (typeof lang !== 'undefined' && TEXT[lang]) ? lang : 'ru'; }catch(e){ return 'ru'; } };
const t = () => TEXT[siteLang()];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// tiny markup for answers: <acc>, <dim>, <ok>, <err> → styled spans
// Minimal markdown for SAI answers. The text is escaped FIRST, so the model
// can never inject HTML; only these patterns become tags: ``` blocks,
// `code`, **bold**, # headings, and "* " / "- " list bullets.
function mdLite(src){
  const blocks = [];
  let s = esc(src).replace(/```[^\n]*\n?([\s\S]*?)(```|$)/g, (m, code) => {
    blocks.push(code.replace(/\n$/, ''));
    return '\u0000' + (blocks.length - 1) + '\u0000';
  });
  s = s.split('\n').map(line => line
    .replace(/^\s{0,3}#{1,6}\s+(.+)$/, '<b>$1</b>')
    .replace(/^(\s*)[*-]\s+/, '$1• ')
  ).join('\n');
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
       .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<pre class="t-code">${blocks[+i]}</pre>`);
}
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
  loginStep = null; loginUser = ''; input.type = 'text'; input.disabled = false;
  if(saiBusy) saiBusy.abort();
  saiMode = false;
  panel.dataset.profile = launch.dataset.profile = profile;
  $('termTitle').textContent = p.title + ' · tty0';
  $('termPrompt').textContent = p.prompt;
  $('termLaunchLabel').textContent = p.title;
  out.innerHTML = '';
  say(perProfile(t().hello));
}

async function runLink(arg){
  const T_ = t();
  if(arg && arg.toLowerCase() === 'off'){ linkSet(null); probeLink(); say(T_.linkForgot); return; }
  if(arg){
    if(!/^https?:\/\/[^\s]+$/i.test(arg)){ say(T_.linkBad); return; }
    linkSet(arg.replace(/\/+$/, ''));
  } else if(!linkGet()){
    say(T_.linkUsage);
    linkSet(LINK_DEFAULT);
  }
  const url = linkGet();
  say(T_.linkChecking(esc(url)));
  const st = await probeLink();
  say(st && st.ok ? t().linkOn(esc(url), esc(st.version)) : t().linkOffline(esc(url)));
}

function setOpen(open){
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  launch.setAttribute('aria-expanded', open ? 'true' : 'false');
  if(open){ probeLink(); launch.classList.remove('is-pulse'); setTimeout(() => input.focus({preventScroll: true}), 30); }
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
  if(cmd === 'login'){ startLogin(); return; }
  if(cmd === 'link'){ runLink(args[0]); return; }
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
    case 'sai': runSai(line.slice(cmdRaw.length).trim()); break;
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

function setPrompt(text, secret){
  $('termPrompt').textContent = text;
  input.type = secret ? 'password' : 'text';
}
function startLogin(){
  loginStep = 'user'; loginUser = '';
  setPrompt(t().loginUser, false);
}
function endLogin(msg){
  loginStep = null; loginUser = '';
  setPrompt(PROFILES[profile].prompt, false);
  if(msg) say(msg);
}
function feedLogin(value){
  if(loginStep === 'user'){
    loginUser = value.trim();
    print(`<span class="t-cmd"><b>${esc(t().loginUser)}</b> ${esc(loginUser)}</span>`);
    loginStep = 'pass';
    setPrompt(t().loginPass, true);
  } else if(loginStep === 'pass'){
    // the password is only ever shown as dots and dropped right away
    print(`<span class="t-cmd"><b>${esc(t().loginPass)}</b> ${'•'.repeat(Math.min(value.length, 16))}</span>`);
    loginStep = 'wait';
    setPrompt('', false);
    input.disabled = true;
    say(`<dim>${t().loginAuth}</dim>`);
    setTimeout(() => { input.disabled = false; endLogin(t().loginOffline); input.focus({preventScroll: true}); }, 900);
  }
}

input.addEventListener('input', () => {
  input.classList.toggle('is-over', saiMode && input.value.length > SAI_USER_MAX);
});

input.addEventListener('keydown', e => {
  if(loginStep && (e.key === 'Escape' || (e.key === 'c' && e.ctrlKey))){
    e.preventDefault(); e.stopPropagation(); input.value = ''; input.disabled = false; endLogin(t().loginCancel); return;
  }
  if(loginStep && e.key === 'Enter'){ e.preventDefault(); const v = input.value; input.value = ''; feedLogin(v); return; }
  if(saiMode && e.key === 'Escape'){
    e.preventDefault(); e.stopPropagation();
    if(saiBusy) saiBusy.abort(); else { saiPrompt(false); say(t().saiExit); }
    return;
  }
  if(saiMode && e.key === 'Enter'){
    e.preventDefault();
    const v = input.value.trim();
    if(!v || saiBusy) return;
    // too long: keep it in the input so it can be shortened, don't echo it
    if(saiTooLong(v)) return;
    input.value = ''; input.classList.remove('is-over');
    print(`<span class="t-cmd"><b>sai&gt;</b> ${esc(v)}</span>`);
    if(v === 'exit' || v === 'quit'){ saiPrompt(false); say(t().saiExit); return; }
    if(v === 'reset'){ saiHistory.length = 0; say(t().saiReset); return; }
    saiAsk(v);
    return;
  }
  if(loginStep && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')){ e.preventDefault(); return; }
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

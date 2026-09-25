// lair.js — lazily-imported chunk for the hidden #lair section.
// Fetched in the background as soon as the crack trigger fires (click 1),
// so it's ready by the time the transition finishes and mount() is called.
// Content itself is static markup already sitting in index.html (hidden) —
// this reveals it, carries the page down to it, brings the watch room's
// CCTV feeds to life and handles entering the rooms behind them.
export function mount({glideMs=2000}={}){
  const section = document.getElementById('lair');
  if(!section) return;
  section.hidden = false;
  section.removeAttribute('aria-hidden');
  // Land with #lair's top about a third of the way down the screen, so the
  // opened rift above it stays in view on arrival.
  const target = Math.max(0, section.getBoundingClientRect().top + window.scrollY - window.innerHeight*0.3);
  glideTo(target, glideMs);
  startFeeds(section);
}

// Watch room feeds: a live CCTV-style timestamp on every screen, and now
// and then a short signal glitch on a random feed.
function startFeeds(section){
  const clocks = section.querySelectorAll('[data-feed-clock]');
  const pad = n => String(n).padStart(2,'0');
  const tick = () => {
    const d = new Date();
    const text = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    clocks.forEach(el => { el.textContent = text; });
  };
  tick();
  setInterval(tick, 1000);

  section.querySelectorAll('.lair-feed').forEach(feed => {
    feed.tabIndex = 0;
    feed.setAttribute('role', 'button');
    const go = () => { const id = feed.dataset.room; if(id && ROOMS[id]) enterRoom(id); else denyAccess(feed); };
    feed.addEventListener('click', go);
    feed.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); } });
  });

  const screens = [...section.querySelectorAll('.feed-screen')];
  if(!screens.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  (function glitchLater(){
    setTimeout(() => {
      if(!document.body.classList.contains('fx-off')){
        const el = screens[Math.floor(Math.random()*screens.length)];
        el.classList.add('is-glitching');
        setTimeout(() => el.classList.remove('is-glitching'), 400);
      }
      glitchLater();
    }, 3500 + Math.random()*6000);
  })();
}

// A slow ease-in-out scroll instead of the browser's quick smooth scroll:
// the viewer is carried down, not yanked. Any input from the viewer
// (wheel, touch, keys) hands control straight back to them.
function glideTo(target, ms){
  const start = window.scrollY, dist = target - start;
  if(!ms || Math.abs(dist) < 2){ window.scrollTo({top:target, behavior:'instant'}); return; }
  const events = ['wheel','touchstart','keydown','mousedown'];
  let stopped = false;
  const stop = () => { stopped = true; events.forEach(ev => window.removeEventListener(ev, stop)); };
  events.forEach(ev => window.addEventListener(ev, stop, {passive:true}));
  const t0 = performance.now();
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  (function step(now){
    if(stopped) return;
    const t = Math.min(1, (now - t0)/ms);
    window.scrollTo({top: start + dist*ease(t), behavior:'instant'});
    if(t < 1) requestAnimationFrame(step); else stop();
  })(t0);
}

// ─── Rooms ───────────────────────────────────────────────────────────────
// Each room's content lives in its own file and is fetched on entry (while
// the camera push-in plays, so the load hides behind the transition). The
// URL carries the room as #<id>: back/forward work, and opening such a link
// directly enters the room instantly (see openLairInstant() in index.html).
const ROOMS = {
  blindspot: { src: 'rooms/blindspot.html', cam: 'CAM_01' },
};
const PUSH_MS = 800;      // feed screen grows to fill the viewport
const CONNECT_MIN_MS = 450; // "CONNECTING…" holds at least this long
const BLACK_MS = 180;
const CRT_MS = 450;       // room switches on like a CRT: a line opening up
const cache = {};
let current = null, busy = false;
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

function loadRoom(id){
  return cache[id] || (cache[id] = fetch(ROOMS[id].src).then(r => {
    if(!r.ok) throw new Error('HTTP ' + r.status + ' for ' + ROOMS[id].src);
    return r.text();
  }));
}

function feedOf(id){ return document.querySelector(`.lair-feed[data-room="${id}"]`); }

function flashMsg(feed, text, ms){
  const screen = feed.querySelector('.feed-screen');
  if(!screen) return;
  let msg = screen.querySelector('.feed-msg');
  if(!msg){ msg = document.createElement('div'); msg.className = 'feed-msg'; screen.appendChild(msg); }
  msg.textContent = text;
  screen.classList.add('show-msg');
  if(ms) setTimeout(() => screen.classList.remove('show-msg'), ms);
}

function denyAccess(feed){
  const screen = feed.querySelector('.feed-screen');
  if(screen){ screen.classList.add('is-glitching'); setTimeout(() => screen.classList.remove('is-glitching'), 400); }
  flashMsg(feed, 'ACCESS PENDING', 1100);
}

function setOtherFeeds(except, off){
  document.querySelectorAll('.lair-feed').forEach(f => {
    if(f === except) return;
    f.classList.toggle('no-signal', off);
    if(off) flashMsg(f, 'NO SIGNAL');
    else { const sc = f.querySelector('.feed-screen'); if(sc) sc.classList.remove('show-msg'); }
  });
}

function fillRoom(view, id, html, img){
  view.innerHTML = `<div class="room-hero" style="background-image:linear-gradient(to bottom,rgba(12,7,22,.35),rgba(12,7,22,.6) 60%,#0c0716),url('${img}')"></div>` + html;
  // translate the freshly inserted fragment to the current site language
  try{
    const t = (typeof T !== 'undefined' && typeof lang !== 'undefined') ? T[lang] : null;
    if(t) view.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if(t[k] !== undefined) el.textContent = t[k]; });
  }catch(e){ /* no i18n available — keep the source text */ }
  const back = view.querySelector('[data-room-back]');
  if(back) back.addEventListener('click', leaveRoom);
}

function showRoom(view){
  view.hidden = false;
  view.setAttribute('aria-hidden', 'false');
  view.scrollTop = 0;
  document.documentElement.classList.add('room-open');
  const back = view.querySelector('[data-room-back]');
  if(back) back.focus({preventScroll:true});
}

function hideRoom(view){
  view.hidden = true;
  view.setAttribute('aria-hidden', 'true');
  view.innerHTML = '';
  document.documentElement.classList.remove('room-open');
}

function zoomLayer(img, cam){
  const layer = document.createElement('div');
  layer.className = 'room-zoom';
  layer.innerHTML = `<img src="${img}" alt=""><div class="feed-grain"></div><div class="room-zoom-osd">${cam} · CONNECTING…</div><div class="room-zoom-black"></div>`;
  document.body.appendChild(layer);
  return layer;
}

const rectBox = r => ({left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
const fullBox = () => ({left: '0px', top: '0px', width: window.innerWidth + 'px', height: window.innerHeight + 'px'});

// The URL hash is the single source of truth for which room is open.
// Clicks, the back button, Esc and browser back/forward only change the
// hash (or ask to); sync() then brings the page in line with it. A
// transition in progress is never interrupted — but whatever was asked for
// meanwhile isn't dropped either: every transition ends with another
// sync(), so the page always settles on what the URL says.
function wantedRoom(){
  const h = location.hash.slice(1);
  return ROOMS[h] && feedOf(h) ? h : null;
}

// After the page has settled on "no room", nothing from a transition may
// linger: feeds back on signal, no zoom layer, room view hidden.
function resetWatchRoom(){
  const view = document.getElementById('roomView');
  if(view && !view.hidden) hideRoom(view);
  document.querySelectorAll('.room-zoom').forEach(l => l.remove());
  setOtherFeeds(null, false);
}

let jumpPending = false; // the hash moved to another site section (nav link)
function sync(){
  if(busy) return; // the running transition calls sync() again when done
  const want = wantedRoom();
  if(want === current){ if(!current) resetWatchRoom(); return; }
  if(current){ const instant = jumpPending; jumpPending = false; closeRoom({instant}); }
  else openRoom(want, {instant: true});
}

// Feed click: push the room into history and play the push-in.
function enterRoom(id){
  if(busy || current || wantedRoom()) return;
  history.pushState({room: id}, '', '#' + id);
  openRoom(id);
}

export async function openRoom(id, {instant = false} = {}){
  const feed = feedOf(id), view = document.getElementById('roomView');
  if(busy || current || !feed || !view || !ROOMS[id]) return;
  busy = true;
  const html = loadRoom(id);
  const img = feed.querySelector('img') ? feed.querySelector('img').getAttribute('src') : '';
  try{
    if(instant || reduce()){
      fillRoom(view, id, await html, img);
      showRoom(view);
    } else {
      setOtherFeeds(feed, true);
      const screen = feed.querySelector('.feed-screen');
      const layer = zoomLayer(img, ROOMS[id].cam);
      const pic = layer.querySelector('img'), osd = layer.querySelector('.room-zoom-osd'), black = layer.querySelector('.room-zoom-black');
      const grow = layer.animate([rectBox(screen.getBoundingClientRect()), fullBox()], {duration: PUSH_MS, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards'});
      pic.animate([{transform: 'scale(1)', filter: 'saturate(.7) brightness(.82) blur(0px)'},
                   {transform: 'scale(1.35)', filter: 'saturate(.5) brightness(1.1) blur(6px)'}],
                  {duration: PUSH_MS + CONNECT_MIN_MS, easing: 'ease-in', fill: 'forwards'});
      osd.animate([{opacity: 0}, {opacity: 1, offset: .5}, {opacity: .4, offset: .75}, {opacity: 1}], {duration: 700, iterations: Infinity});
      const content = await Promise.all([html, grow.finished, wait(PUSH_MS + CONNECT_MIN_MS)]).then(r => r[0]);
      await black.animate([{opacity: 0}, {opacity: 1}], {duration: BLACK_MS, fill: 'forwards'}).finished;
      fillRoom(view, id, content, img);
      showRoom(view);
      await view.animate([{clipPath: 'inset(49.6% 0 49.6% 0)', filter: 'brightness(3)'},
                          {clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)', offset: .7},
                          {clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)'}],
                         {duration: CRT_MS, easing: 'cubic-bezier(.2,.8,.2,1)'}).finished;
      layer.remove();
    }
    current = id;
  } catch(err){
    console.error('[lair] room failed to open', err);
    current = null;
    resetWatchRoom();
    if(wantedRoom() === id) history.replaceState(null, '', location.pathname + location.search);
    flashMsg(feed, 'SIGNAL LOST', 1500);
  } finally {
    busy = false;
    sync();
  }
}

export async function closeRoom({instant = false} = {}){
  const view = document.getElementById('roomView');
  if(busy || !current || !view) return;
  busy = true;
  const feed = feedOf(current);
  current = null;
  try{
    if(instant || reduce() || !feed){
      resetWatchRoom();
    } else {
      const img = feed.querySelector('img') ? feed.querySelector('img').getAttribute('src') : '';
      const layer = zoomLayer(img, '');
      const pic = layer.querySelector('img');
      layer.querySelector('.room-zoom-osd').remove();
      Object.assign(layer.style, fullBox());
      // CRT off: the room collapses to a bright line…
      await view.animate([{clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)'},
                          {clipPath: 'inset(49.6% 0 49.6% 0)', filter: 'brightness(3)'}],
                         {duration: 320, easing: 'cubic-bezier(.7,0,.8,.4)', fill: 'forwards'}).finished;
      hideRoom(view);
      // …and the camera pulls back out into its monitor.
      const screen = feed.querySelector('.feed-screen');
      pic.animate([{transform: 'scale(1.35)', filter: 'saturate(.5) brightness(1.1) blur(6px)'},
                   {transform: 'scale(1)', filter: 'saturate(.7) brightness(.82) blur(0px)'}],
                  {duration: PUSH_MS, easing: 'ease-out', fill: 'forwards'});
      await layer.animate([fullBox(), rectBox(screen.getBoundingClientRect())], {duration: PUSH_MS, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards'}).finished;
      setOtherFeeds(null, false);
      await layer.animate([{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'}).finished;
      layer.remove();
    }
  } catch(err){
    console.error('[lair] room failed to close cleanly', err);
    resetWatchRoom();
  } finally {
    busy = false;
    sync();
  }
}

// "← WATCH ROOM" / Esc: ask for "no room". If this history entry is the one
// our feed click pushed, step back (so our button and the browser's back
// button behave the same); otherwise — direct entry — just drop the hash.
// Either way it only changes the URL; sync() does the rest, now or as soon
// as the running transition ends.
function leaveRoom(){
  if(!wantedRoom()) return;
  if(history.state && history.state.room === wantedRoom()){ history.back(); return; }
  history.replaceState(null, '', location.pathname + location.search);
  sync();
}

window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  // jumping to another section of the site (nav link) → close at once so
  // the jump lands; plain "back" → play the pull-back animation
  if(h && !ROOMS[h] && document.getElementById(h)) jumpPending = true;
  sync();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && wantedRoom() && !document.querySelector('.contacts-drawer.is-open')) leaveRoom();
});

// lair.js — lazily-imported chunk for the hidden #lair section.
// Fetched in the background as soon as the crack trigger fires (click 1),
// so it's ready by the time the transition finishes and mount() is called.
// Content itself is static markup already sitting in index.html (hidden) —
// this just reveals it and carries the page down to it. Real dynamic content
// (narrative, interactivity) is a later phase; the monitor placeholders
// are only there to prove the transition + mount actually work.
export function mount({glideMs=2000}={}){
  const section = document.getElementById('lair');
  if(!section) return;
  section.hidden = false;
  section.removeAttribute('aria-hidden');
  // Land with #lair's top about a third of the way down the screen, so the
  // opened rift above it stays in view on arrival.
  const target = Math.max(0, section.getBoundingClientRect().top + window.scrollY - window.innerHeight*0.3);
  glideTo(target, glideMs);
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

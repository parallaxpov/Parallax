// lair.js — lazily-imported chunk for the hidden #lair section.
// Fetched in the background as soon as the crack trigger fires (click 1),
// so it's ready by the time the transition finishes and mount() is called.
// Content itself is static markup already sitting in index.html (hidden) —
// this just reveals it and scrolls it into view. Real dynamic content
// (narrative, interactivity) is a later phase; the monitor placeholders
// are only there to prove the transition + mount actually work.
export function mount(){
  const section = document.getElementById('lair');
  if(!section) return;
  section.hidden = false;
  section.removeAttribute('aria-hidden');
  section.scrollIntoView({behavior:'smooth', block:'start'});
}

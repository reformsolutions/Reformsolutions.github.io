// Process page: a cable runs down beside the seven stages. As each stage comes up the screen, the
// cable reaches down to it and its plug stops against the stage's node, which then lights up;
// scrolling back pulls the cable back. The cable and plug move with CSS transitions, so nothing is
// drawn on every scroll.
const PLUG = 68; // the plug's length: its tip stops at the node
const START = 26; // cable showing above the first stage before it begins

export function initStages() {
  const list = document.querySelector('.stages__list');
  if (!list) return;
  const spine = list.querySelector('.stages__spine');
  const stages = [...list.querySelectorAll('.pstage')];
  let reachAt = []; // where the cable ends for each stage, as a distance down the list
  let active = -1;

  const apply = () => {
    const reach = active < 0 ? START : reachAt[active];
    spine.style.setProperty('--reach', `${reach.toFixed(1)}px`);
    spine.style.setProperty('--p', (reach / Math.max(1, list.offsetHeight)).toFixed(4));
    stages.forEach((s, i) => s.classList.toggle('is-on', i <= active));
  };
  // measured when ScrollTrigger refreshes (load, resize), never while scrolling; layout offsets,
  // so parts still sliding in don't throw it off
  const measure = () => {
    reachAt = stages.map((s) => Math.max(START, s.offsetTop + s.querySelector('.pstage__node').offsetTop - PLUG));
    apply();
  };

  stages.forEach((stage, i) =>
    ScrollTrigger.create({
      trigger: stage,
      start: 'top 62%',
      onEnter: () => {
        active = Math.max(active, i);
        apply();
      },
      onLeaveBack: () => {
        active = i - 1;
        apply();
      },
    })
  );
  ScrollTrigger.addEventListener('refresh', measure);
  measure();
  list.classList.add('is-live');
}

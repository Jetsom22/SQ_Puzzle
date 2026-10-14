import { h, sleep, frame } from './dom.js';

/**
 * 연출 레이어 — 모든 연출은 Promise 를 반환하고, 속도 배율(speed)을 따릅니다.
 */
export class Fx {
  constructor(stage) {
    this.stage = stage;
    this.layer = h('div', { class: 'fx-layer' });
    stage.append(this.layer);
    this.speed = 1;
  }

  get scale() {
    return this.stage.getBoundingClientRect().width / 1920 || 1;
  }

  wait(ms) {
    return sleep(ms / this.speed);
  }

  /** 요소 중심의 스테이지 좌표 */
  center(el) {
    const s = this.stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = this.scale;
    return { x: (r.left - s.left + r.width / 2) / k, y: (r.top - s.top + r.height / 2) / k };
  }

  replay(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  async shot(fromEl, toEl, color) {
    if (!fromEl || !toEl) return;
    const a = this.center(fromEl);
    const b = this.center(toEl);
    const dur = 260 / this.speed;
    const dot = h('div', { class: 'shot', '--c': color, style: { left: `${a.x}px`, top: `${a.y}px` } });
    this.layer.append(dot);
    await frame();
    dot.style.transition = `transform ${dur}ms cubic-bezier(.5,0,.8,.6)`;
    dot.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px)`;
    await sleep(dur);
    dot.remove();
  }

  number(el, text, { color = '#fff', note, noteClass = '', cls = '' } = {}) {
    if (!el) return;
    const p = this.center(el);
    const n = h(
      'div',
      { class: `dmg ${cls}`, '--c': color, style: { left: `${p.x + (Math.random() * 40 - 20)}px`, top: `${p.y - 20}px` } },
      text,
      note ? h('em', { class: noteClass }, note) : null,
    );
    this.layer.append(n);
    setTimeout(() => n.remove(), 950 / this.speed);
  }

  async banner(title, sub, { kind = '', top = 46, hold = 1000 } = {}) {
    const b = h('div', { class: `banner ${kind}`, style: { top: `${top}%` } }, h('div', { class: 't' }, title), sub ? h('div', { class: 's' }, sub) : null);
    this.layer.append(b);
    await this.wait(hold);
    b.remove();
  }

  /** 보드 위 라인 광선 */
  ray(boardEl, fromCell, toCell, color, label) {
    if (!fromCell || !toCell) return;
    const k = this.scale;
    const br = boardEl.getBoundingClientRect();
    const c = (el) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - br.left + r.width / 2) / k, y: (r.top - br.top + r.height / 2) / k };
    };
    const a = c(fromCell);
    const b = c(toCell);
    const len = Math.hypot(b.x - a.x, b.y - a.y) + 70;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const ray = h(
      'div',
      {
        class: 'line-ray',
        '--c': color,
        style: {
          left: `${a.x - 35 * Math.cos(ang)}px`,
          top: `${a.y - 35 * Math.sin(ang) - 6}px`,
          width: `${len}px`,
          transform: `rotate(${ang}rad)`,
        },
      },
      h('span', { style: { transform: `translate(-50%, -50%) rotate(${-ang}rad) translateY(-34px)` } }, label),
    );
    boardEl.append(ray);
    setTimeout(() => ray.remove(), 820 / this.speed);
  }
}

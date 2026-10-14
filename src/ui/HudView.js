import { h } from './dom.js';

export class HudView {
  constructor(app) {
    this.app = app;
    this.stageName = h('span', { class: 'stage-name' });
    this.wave = h('div', { class: 'pill' });
    this.turn = h('div', { class: 'pill' });
    this.autoBtn = h('button', { class: 'btn', onClick: () => app.toggleAuto() }, '오토 ', h('kbd', {}, 'A'));
    this.speedBtn = h('button', { class: 'btn', onClick: () => app.cycleSpeed() });
    this.el = h(
      'header',
      { class: 'hud' },
      h('div', { class: 'hud-left' }, h('span', { class: 'logo' }, 'Square Hearts'), this.stageName),
      h('div', { class: 'hud-center' }, this.wave, this.turn),
      h(
        'div',
        { class: 'hud-right' },
        this.autoBtn,
        this.speedBtn,
        h('button', { class: 'btn', onClick: () => app.openDev() }, '규칙 편집'),
        h('button', { class: 'btn', onClick: () => app.restart() }, '재시작'),
      ),
    );
  }

  update() {
    const b = this.app.battle;
    this.stageName.textContent = b.stage.name;
    this.wave.replaceChildren(h('span', { class: 'k' }, 'WAVE'), h('span', { class: 'v' }, b.waveIndex + 1, h('small', {}, ` / ${b.waveCount}`)));
    const left = b.turnLimit - b.turn;
    this.turn.className = `pill${left <= 2 ? ' warn' : ''}`;
    this.turn.replaceChildren(h('span', { class: 'k' }, 'TURN'), h('span', { class: 'v' }, b.turn, h('small', {}, ` / ${b.turnLimit}`)));
    this.autoBtn.classList.toggle('on', this.app.auto);
    this.speedBtn.replaceChildren(`속도 x${this.app.fx.speed}`);
  }
}

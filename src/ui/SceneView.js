import { h } from './dom.js';
import { iconSvg } from './icons.js';

/** 전투 씬: 상단 몬스터 + 하단 팀 카드 */
export class SceneView {
  constructor(app) {
    this.app = app;
    this.el = h('section', { class: 'panel scene', 'aria-label': '전투' });
    this.enemiesEl = h('div', { class: 'enemies' });
    this.teamEl = h('div', { class: 'team' });
    this.el.append(this.enemiesEl, this.teamEl);
    this.enemyNodes = new Map();
    this.unitNodes = new Map();
  }

  get battle() {
    return this.app.battle;
  }

  color(el) {
    return this.battle.elements.get(el)?.color ?? '#888';
  }

  glyph(name) {
    return [...name.replace(/\(.*\)|\s/g, '')][0] ?? '?';
  }

  // ───────────── 몬스터 ─────────────
  buildEnemies() {
    this.enemiesEl.replaceChildren();
    this.enemyNodes.clear();
    for (const m of this.battle.enemies) {
      const el = this.battle.elements.get(m.element);
      const refs = {};
      const node = h(
        'div',
        {
          class: `enemy${m.def.boss ? ' boss' : ''}`,
          title: `${m.name} — 클릭하여 집중 공격`,
          onClick: () => this.app.onEnemyClick(m),
        },
        (refs.cd = h('div', { class: 'countdown' })),
        (refs.orb = h('div', { class: 'orb', '--c': el.color, html: iconSvg(el.icon) })),
        h('div', { class: 'stars' }, '★'.repeat(m.def.star ?? 1)),
        h('div', { class: 'enemy-name' }, h('span', { class: 'lv' }, `LV.${m.def.level ?? 1}`), m.name),
        (refs.bar = h('div', { class: 'bar' }, h('b'), h('i'), (refs.num = h('span', { class: 'num' })))),
        (refs.chips = h('div', { class: 'chips' })),
      );
      refs.node = node;
      this.enemyNodes.set(m, refs);
      this.enemiesEl.append(node);
    }
    this.update();
  }

  // ───────────── 팀 ─────────────
  buildTeam() {
    this.teamEl.replaceChildren();
    this.unitNodes.clear();
    const keys = this.app.skillKeys;
    for (const u of this.battle.team) {
      const el = this.battle.elements.get(u.element);
      const skill = this.battle.skillOf(u);
      const refs = {};
      const tip = h(
        'div',
        { class: 'tip' },
        h('strong', {}, `${u.name}`),
        h('div', { class: 'meta' }, `${el.name} · ATK ${u.baseAtk} · HP ${u.baseHp}${u.def.attack?.target === 'enemyAll' ? ' · 전체 공격' : ''}`),
        skill ? h('div', {}, `[${keys[u.slot]?.toUpperCase()}] ${skill.name} (${skill.cooldown}턴) — ${skill.desc}`) : null,
        u.def.leaderSkill && this.battle.leader === u ? h('div', {}, `리더: ${this.battle.data.skills[u.def.leaderSkill].desc}`) : null,
        u.def.passive ? h('div', {}, `패시브: ${this.battle.data.skills[u.def.passive].desc}`) : null,
      );
      const node = h(
        'div',
        { class: 'unit', '--c': el.color, onClick: () => this.app.useSkill(u.slot) },
        (refs.mult = h('div', { class: 'mult' }, 'x1')),
        h(
          'div',
          { class: 'portrait' },
          h('span', { class: 'glyph' }, this.glyph(u.name)),
          h('span', { class: 'el', html: iconSvg(el.icon) }),
          this.battle.leader === u ? h('span', { class: 'crown' }, 'LEADER') : null,
        ),
        h('div', { class: 'unit-name' }, u.name),
        (refs.bar = h('div', { class: 'bar hp-team' }, h('b'), h('i'), (refs.num = h('span', { class: 'num' })))),
        (refs.gauge = h('div', { class: 'gauge' })),
        tip,
      );
      refs.node = node;
      this.unitNodes.set(u, refs);
      this.teamEl.append(node);
    }
    this.update();
  }

  #setBar(refs, u) {
    const p = `${(u.hp / u.maxHp) * 100}%`;
    refs.bar.style.setProperty('--p', p);
    refs.bar.style.setProperty('--lag', p);
    refs.num.textContent = `${u.hp} / ${u.maxHp}`;
  }

  #chips(container, u) {
    container.replaceChildren(
      ...u.statuses
        .filter((s) => Number.isFinite(s.duration) || s.type !== 'modifier')
        .map((s) =>
          h(
            'span',
            { class: `chip ${s.type === 'stun' ? 'stun' : s.mult < 1 && s.stat === 'atk' ? 'debuff' : ''}` },
            `${s.label ?? s.type}${Number.isFinite(s.duration) ? ` ${s.duration}` : ''}`,
          ),
        ),
    );
  }

  update() {
    const b = this.battle;
    for (const [m, refs] of this.enemyNodes) {
      refs.node.classList.toggle('dead', !m.alive);
      refs.node.classList.toggle('focused', b.focus === m);
      this.#setBar(refs, m);
      refs.cd.replaceChildren(h('span', { class: 'k' }, 'TURN'), h('span', { class: 'v' }, m.countdown));
      refs.cd.classList.toggle('imminent', m.countdown <= 1);
      this.#chips(refs.chips, m);
    }
    for (const [u, refs] of this.unitNodes) {
      const skill = b.skillOf(u);
      refs.node.classList.toggle('dead', !u.alive);
      refs.node.classList.toggle('ready', b.isSkillReady(u) && b.isInput);
      refs.node.classList.toggle('stunned', u.alive && u.has('stun'));
      this.#setBar(refs, u);
      const cd = skill?.cooldown ?? 0;
      refs.gauge.replaceChildren(...Array.from({ length: cd }, (_, i) => h('i', { class: i < u.charge ? 'on' : '' })));
    }
  }

  showMultipliers(byElement) {
    for (const [u, refs] of this.unitNodes) {
      const m = byElement?.[u.element] ?? 0;
      refs.mult.textContent = `x${m}`;
      refs.mult.classList.toggle('show', m > 0 && u.alive);
    }
  }

  enemyNode(m) {
    return this.enemyNodes.get(m)?.orb;
  }

  unitNode(u) {
    return this.unitNodes.get(u)?.node;
  }

  nodeOf(unit) {
    return unit.side === 'enemy' ? this.enemyNode(unit) : this.unitNode(unit);
  }
}

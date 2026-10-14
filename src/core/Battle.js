import { Board } from './Board.js';
import { ElementSystem } from './ElementSystem.js';
import { EventBus } from './EventBus.js';
import { Rng } from './Rng.js';
import { Unit } from './Unit.js';
import { allowedCells } from './Placement.js';
import { scoreTurn } from './Scoring.js';
import { pickTarget } from './Targeting.js';
import { computeDamage } from './Damage.js';
import { runEffects } from './Effects.js';
import { deepMerge } from './util.js';

/**
 * 전투 진행 (턴 상태 머신) — DOM 비의존.
 *
 * phase: 'init' → 'input' ⇄ ('resolve' → 'enemy') → … → 'victory' | 'defeat'
 *
 * 한 턴의 흐름
 *   1. input   : 손패 블록을 보드에 배치 (perTurn 개), 액티브 스킬 사용 가능
 *   2. resolve : 라인/블록 배율 계산 → 같은 속성 캐릭터가 공격
 *   3. enemy   : 몬스터 카운트다운 감소, 0 이면 패턴 스킬 사용
 *   4. 턴 종료 : 스킬 충전, 보드 가득 차면 초기화, 손패 보충, 제한 턴 체크
 *
 * UI 는 bus 이벤트를 구독해 연출하고, 핸들러가 반환한 Promise 가 끝나야 다음 단계로 진행합니다.
 */
export class Battle {
  /**
   * @param {object} o
   * @param {object} o.data   config/index.js 의 GAME_DATA
   * @param {object} o.rules  config/rules.js 의 RULES (복사본)
   * @param {string} o.stageId
   * @param {{members: string[], leader: number}} [o.team]
   * @param {EventBus} [o.bus]
   * @param {number} [o.seed]
   */
  constructor({ data, rules, stageId, team, bus, seed }) {
    this.data = data;
    this.stageId = stageId;
    this.stage = data.stages[stageId];
    if (!this.stage) throw new Error(`스테이지 '${stageId}' 없음`);
    this.rules = deepMerge(rules, this.stage.rules ?? {});
    this.bus = bus ?? new EventBus();
    this.rng = new Rng(seed ?? this.rules.seed ?? undefined);
    this.elements = new ElementSystem(data.elements, data.elementChart);

    const layoutId = this.stage.layout ?? this.rules.board.layout;
    this.layout = data.boards[layoutId];
    if (!this.layout) throw new Error(`보드 레이아웃 '${layoutId}' 없음`);
    this.board = new Board({
      layout: this.layout,
      elements: this.elements,
      rng: this.rng,
      minLine: this.rules.scoring.minLine,
      avoidInitialLines: this.rules.board.avoidInitialLines,
    });

    const t = team ?? data.defaultTeam;
    this.team = t.members.map((id, slot) => {
      const def = data.characters[id];
      if (!def) throw new Error(`캐릭터 '${id}' 없음`);
      return new Unit(id, def, { side: 'player', slot });
    });
    this.leader = this.team[t.leader] ?? null;

    this.enemies = [];
    this.waveIndex = -1;
    this.turn = 1;
    this.turnLimit = this.stage.turnLimit ?? this.rules.turn.limit;
    this.hand = [];
    this.placements = [];
    this.focus = null;
    this.lastScore = null;
    this.phase = 'init';
    this.result = null;
    this.stats = { damageDealt: 0, damageTaken: 0, bestMultiplier: 0, lines: 0 };
  }

  // ─────────────────────────── 이벤트 / 로그 ───────────────────────────
  emit(type, payload = {}) {
    return this.bus.emit(type, payload);
  }

  log(text, kind = 'info') {
    this.bus.emit('log', { text, kind });
  }

  async setPhase(phase) {
    this.phase = phase;
    await this.emit('phase', { phase });
  }

  // ─────────────────────────── 시작 ───────────────────────────
  async start() {
    for (const u of this.team) {
      const skill = this.skillOf(u);
      if (skill && this.rules.skill.startCharged) u.charge = skill.cooldown ?? 0;
    }
    // 리더 스킬 → 패시브 (영구 modifier)
    if (this.leader?.def.leaderSkill) await this.#applyPassive(this.leader, this.leader.def.leaderSkill, 'leader');
    for (const u of this.team) if (u.def.passive) await this.#applyPassive(u, u.def.passive, 'passive');

    this.refillHand();
    await this.startWave(0);
    this.log(`전투 시작 — ${this.stage.name}`, 'system');
    await this.setPhase('input');
    await this.emit('turnStart', { turn: this.turn });
  }

  async #applyPassive(unit, skillId, source) {
    const skill = this.data.skills[skillId];
    if (!skill) return;
    await runEffects(skill.effects, this.#ctx(unit, `${source}:${unit.id}`));
    this.log(`${source === 'leader' ? '리더 스킬' : '패시브'} [${skill.name}] ${skill.desc}`, 'skill');
  }

  async startWave(index) {
    this.waveIndex = index;
    this.focus = null;
    this.enemies = this.stage.waves[index].map((id, slot) => {
      const def = this.data.monsters[id];
      if (!def) throw new Error(`몬스터 '${id}' 없음`);
      return new Unit(id, def, { side: 'enemy', slot });
    });
    this.log(`Wave ${index + 1} / ${this.stage.waves.length}`, 'system');
    await this.emit('waveStart', { index });
  }

  // ─────────────────────────── 조회 ───────────────────────────
  get waveCount() {
    return this.stage.waves.length;
  }

  get isInput() {
    return this.phase === 'input';
  }

  skillOf(unit) {
    return unit.skillId ? this.data.skills[unit.skillId] : null;
  }

  isSkillReady(unit) {
    const skill = this.skillOf(unit);
    return !!skill && unit.alive && !unit.has('stun') && unit.charge >= (skill.cooldown ?? 0);
  }

  allowedCells() {
    if (!this.isInput) return { cells: [], forced: false };
    return allowedCells(this.board, this.placements, this.rules.placement);
  }

  isAllowed(r, c) {
    return this.allowedCells().cells.some(([rr, cc]) => rr === r && cc === c);
  }

  /** 현재 배치 상태로 계산한 배율 미리보기 */
  previewScore() {
    return scoreTurn(this.board, this.placements, this.rules.scoring);
  }

  pickTargetFor(attacker, candidates, element) {
    const isPlayer = attacker.side === 'player';
    return pickTarget(attacker, candidates, {
      strategy: this.rules.combat.targetStrategy,
      focus: isPlayer && this.rules.combat.allowFocusTarget ? this.focus : null,
      elements: this.elements,
      rng: this.rng,
      element,
      tieBreak: isPlayer ? 'first' : 'random',
    });
  }

  #ctx(caster, source) {
    const isPlayer = caster.side === 'player';
    return {
      battle: this,
      caster,
      allies: isPlayer ? this.team : this.enemies,
      enemies: isPlayer ? this.enemies : this.team,
      source,
    };
  }

  // ─────────────────────────── 손패 ───────────────────────────
  refillHand() {
    const { size, fill } = this.rules.hand;
    const ids = this.elements.ids;
    while (this.hand.length < size) this.hand.push(null);
    const bag = fill === 'eachElement' ? this.rng.shuffle(ids) : null;
    let k = 0;
    this.hand = this.hand.map((slot) => slot ?? { element: bag ? bag[k++ % bag.length] : this.rng.pick(ids) });
  }

  // ─────────────────────────── 플레이어 입력 ───────────────────────────
  /** @returns {Promise<{ok: boolean, reason?: string}>} */
  async place(handIndex, r, c) {
    if (!this.isInput) return { ok: false, reason: '입력 단계가 아님' };
    const block = this.hand[handIndex];
    if (!block) return { ok: false, reason: '빈 손패' };
    if (!this.isAllowed(r, c)) return { ok: false, reason: '배치 불가 위치' };

    this.board.place(r, c, block.element);
    this.hand[handIndex] = null;
    this.placements.push({ r, c, element: block.element, handIndex });
    await this.emit('placed', { r, c, element: block.element });

    const done =
      this.placements.length >= this.rules.placement.perTurn ||
      this.allowedCells().cells.length === 0 ||
      this.hand.every((h) => !h);
    if (done) await this.resolveTurn();
    return { ok: true };
  }

  async undo() {
    if (!this.isInput || !this.rules.placement.allowUndo || !this.placements.length) return false;
    const p = this.placements.pop();
    this.board.remove(p.r, p.c);
    this.hand[p.handIndex] = { element: p.element };
    await this.emit('undo', p);
    return true;
  }

  setFocus(enemy) {
    if (!this.rules.combat.allowFocusTarget) return;
    this.focus = this.focus === enemy || !enemy?.alive ? null : enemy;
    this.emit('focus', { unit: this.focus });
  }

  async useSkill(slot) {
    const unit = this.team[slot];
    if (!this.isInput || !unit || !this.isSkillReady(unit)) return false;
    const skill = this.skillOf(unit);
    unit.charge = 0;
    this.log(`${unit.name} — [${skill.name}] ${skill.desc}`, 'skill');
    await this.emit('skillStart', { unit, skill });
    await runEffects(skill.effects, this.#ctx(unit, `skill:${unit.id}`));
    await this.emit('skillEnd', { unit, skill });
    await this.#checkWaveClear();
    return true;
  }

  // ─────────────────────────── 보드/손패 조작 (스킬용) ───────────────────────────
  async convertBoard({ from, to, count, casterElement }) {
    const match = (el) => {
      if (!el || el === '*') return false;
      if (from === 'any') return el !== to;
      if (from === 'notSelf') return el !== casterElement && el !== to;
      return Array.isArray(from) ? from.includes(el) : el === from;
    };
    let cells = this.board.filledCells().filter(([r, c]) => !this.board.cell(r, c).block.fixed && match(this.board.elementAt(r, c)));
    cells = this.rng.shuffle(cells);
    if (count !== 'all') cells = cells.slice(0, count);
    for (const [r, c] of cells) this.board.setElement(r, c, to);
    await this.emit('boardChanged', { cells, reason: 'convert' });
  }

  async convertHand(to) {
    this.hand = this.hand.map((b) => (b ? { element: to } : b));
    await this.emit('handChanged', {});
  }

  async refreshBoard() {
    this.board.reset();
    // 이번 턴에 이미 놓은 블록은 유지 (빈칸 위에 놓였으므로 항상 복원 가능)
    for (const p of this.placements) if (this.board.isEmpty(p.r, p.c)) this.board.place(p.r, p.c, p.element);
    await this.emit('boardChanged', { reason: 'refresh' });
  }

  // ─────────────────────────── 전투 처리 ───────────────────────────
  async dealDamage(attacker, defender, { multiplier = 1, element, fixed, lifesteal, source }) {
    const ctx = computeDamage({
      attacker,
      defender,
      multiplier,
      element: element ?? attacker.element,
      fixed,
      elements: this.elements,
    });
    const amount = Math.min(defender.hp, ctx.value);
    defender.hp -= amount;
    if (attacker.side === 'player') this.stats.damageDealt += amount;
    else this.stats.damageTaken += amount;
    await this.emit('damage', { attacker, defender, amount: ctx.value, relation: ctx.relation, element: ctx.element, source });
    if (lifesteal && attacker.alive) await this.heal(attacker, amount * lifesteal, source);
    if (!defender.alive) {
      if (this.focus === defender) this.focus = null;
      this.log(`${defender.name} 쓰러짐`, defender.side === 'enemy' ? 'good' : 'bad');
      await this.emit('death', { unit: defender });
    }
    return ctx.value;
  }

  async heal(unit, amount, source) {
    if (!unit.alive) return 0;
    const v = Math.min(unit.maxHp - unit.hp, Math.round(amount));
    unit.hp += v;
    await this.emit('heal', { unit, amount: v, source });
    return v;
  }

  async revive(unit, percent) {
    if (unit.alive) return;
    unit.hp = Math.max(1, Math.round(unit.maxHp * percent));
    unit.statuses = unit.statuses.filter((s) => !Number.isFinite(s.duration));
    this.log(`${unit.name} 부활`, 'good');
    await this.emit('revive', { unit });
  }

  async resolveTurn() {
    await this.setPhase('resolve');
    const score = this.previewScore();
    this.lastScore = score;
    this.stats.lines += score.lines.length;
    this.stats.bestMultiplier = Math.max(this.stats.bestMultiplier, ...Object.values(score.byElement), 0);
    await this.emit('score', { score });

    // 플레이어 공격: 같은 속성 캐릭터가 배율만큼 공격
    for (const u of this.team) {
      if (!u.alive) continue;
      const mult = score.byElement[u.element] ?? 0;
      if (mult <= 0) continue;
      if (u.has('stun')) {
        this.log(`${u.name} 기절 상태 — 공격 불가`, 'bad');
        continue;
      }
      if (!this.enemies.some((e) => e.alive)) break;
      const atk = u.def.attack ?? {};
      await this.emit('attackStart', { unit: u, multiplier: mult });
      await runEffects(
        [{ type: 'damage', target: atk.target ?? 'enemy', multiplier: mult * (atk.ratio ?? 1) }],
        this.#ctx(u, 'attack'),
      );
    }
    for (const u of this.team) u.tickStatuses();

    const wave = await this.#checkWaveClear();
    if (wave === 'victory') return;
    if (wave !== 'next') await this.#enemyPhase();
    if (this.team.every((u) => !u.alive)) return this.#finish('defeat', '팀 전멸');
    await this.#endTurn();
  }

  async #enemyPhase() {
    await this.setPhase('enemy');
    for (const m of this.enemies) {
      if (!m.alive) continue;
      if (m.has('stun')) {
        this.log(`${m.name} 기절 — 행동 불가`, 'good');
        continue;
      }
      m.countdown -= 1;
      if (m.countdown > 0) continue;
      const pattern = m.def.pattern ?? ['bite'];
      const skillId = pattern[m.patternIndex % pattern.length];
      m.patternIndex++;
      const skill = this.data.skills[skillId];
      this.log(`${m.name} — [${skill.name}]`, 'enemy');
      await this.emit('enemyAction', { unit: m, skill });
      await runEffects(skill.effects, this.#ctx(m, `enemy:${m.id}`));
      m.countdown = m.attackInterval;
      if (this.team.every((u) => !u.alive)) break;
    }
    for (const m of this.enemies) m.tickStatuses();
    await this.emit('status', {});
  }

  /** @returns {Promise<null|'next'|'victory'>} */
  async #checkWaveClear() {
    if (this.enemies.some((e) => e.alive)) return null;
    if (this.phase === 'victory') return 'victory';
    await this.emit('waveClear', { index: this.waveIndex });
    if (this.waveIndex + 1 < this.waveCount) {
      await this.startWave(this.waveIndex + 1);
      return 'next';
    }
    await this.#finish('victory', '모든 웨이브 클리어');
    return 'victory';
  }

  async #endTurn() {
    this.placements = [];
    for (const u of this.team) {
      const skill = this.skillOf(u);
      if (skill && u.alive) u.charge = Math.min(skill.cooldown ?? 0, u.charge + this.rules.skill.chargePerTurn);
    }
    if (this.rules.board.resetWhenFull && this.board.isFull()) {
      this.board.reset();
      this.log('보드가 가득 차 초기화되었습니다', 'system');
      await this.emit('boardReset', {});
    }
    this.refillHand();
    if (this.turn >= this.turnLimit) return this.#finish('defeat', '제한 턴 초과');
    this.turn += 1;
    await this.setPhase('input');
    await this.emit('turnStart', { turn: this.turn });
  }

  async #finish(result, reason) {
    this.result = { result, reason, turn: this.turn };
    this.log(result === 'victory' ? `승리! (${reason})` : `패배… (${reason})`, result === 'victory' ? 'good' : 'bad');
    await this.setPhase(result);
    await this.emit('end', this.result);
  }
}

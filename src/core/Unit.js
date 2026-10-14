let nextUid = 1;

/** filter 의 모든 키가 ctx 와 일치하면 true (filter 없으면 항상 true) */
function matchFilter(filter, ctx) {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => (Array.isArray(v) ? v.includes(ctx[k]) : ctx[k] === v));
}

/**
 * 전투 유닛 (캐릭터/몬스터 공통)
 * statuses: { id, type: 'modifier'|'stun'|..., stat?, mult?, filter?, duration, label? }
 *   - modifier.stat: 'atk' | 'maxHp' | 'damageDealt' | 'damageTaken' (자유롭게 확장 가능)
 *   - duration: 소유자 진영의 행동 페이즈가 끝날 때마다 1 감소 (Infinity = 영구)
 */
export class Unit {
  constructor(id, def, { side, slot }) {
    this.uid = nextUid++;
    this.id = id;
    this.def = def;
    this.side = side;
    this.slot = slot;
    this.name = def.name;
    this.element = def.element;
    this.baseHp = def.hp;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.baseAtk = def.atk;
    this.statuses = [];
    // 캐릭터
    this.skillId = def.skill ?? null;
    this.charge = 0;
    // 몬스터
    this.attackInterval = def.attackInterval ?? 0;
    this.countdown = this.attackInterval;
    this.patternIndex = 0;
  }

  get alive() {
    return this.hp > 0;
  }

  get hpRatio() {
    return this.maxHp ? this.hp / this.maxHp : 0;
  }

  /** stat 에 걸린 modifier 배율의 곱 */
  modifier(stat, ctx = {}) {
    let m = 1;
    for (const s of this.statuses) if (s.type === 'modifier' && s.stat === stat && matchFilter(s.filter, ctx)) m *= s.mult;
    return m;
  }

  get atk() {
    return this.baseAtk * this.modifier('atk');
  }

  /** maxHp modifier 적용 (현재 체력 비율 유지) */
  recalcMaxHp() {
    const ratio = this.hpRatio;
    this.maxHp = Math.round(this.baseHp * this.modifier('maxHp'));
    this.hp = Math.round(this.maxHp * ratio);
  }

  has(type) {
    return this.statuses.some((s) => s.type === type);
  }

  /** 같은 id 의 상태는 덮어씀 */
  addStatus(status) {
    this.statuses = this.statuses.filter((s) => s.id !== status.id);
    this.statuses.push({ ...status, duration: status.duration ?? Infinity });
  }

  tickStatuses() {
    for (const s of this.statuses) if (Number.isFinite(s.duration)) s.duration -= 1;
    const expired = this.statuses.filter((s) => s.duration <= 0);
    this.statuses = this.statuses.filter((s) => s.duration > 0);
    return expired;
  }
}

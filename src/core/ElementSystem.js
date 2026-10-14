/** 속성 조회 + 상성 계산 */
export class ElementSystem {
  constructor(list, chart) {
    this.list = list;
    this.chart = chart;
    this.byId = new Map(list.map((e) => [e.id, e]));
    this.byKey = new Map(list.map((e) => [e.key, e.id]));
  }

  get ids() {
    return this.list.map((e) => e.id);
  }

  get(id) {
    return this.byId.get(id);
  }

  isStrong(attacker, defender) {
    return (this.chart.strongAgainst[attacker] ?? []).includes(defender);
  }

  /** +1: 공격측 유리, -1: 방어측 유리, 0: 동등 */
  relation(attacker, defender) {
    if (this.isStrong(attacker, defender)) return 1;
    if (this.isStrong(defender, attacker)) return -1;
    return 0;
  }

  damageModifier(attacker, defender) {
    const r = this.relation(attacker, defender);
    if (r > 0) return 1 + this.chart.advantageDamageBonus;
    if (r < 0) return 1 - this.chart.advantageDamageReduction;
    return 1;
  }
}

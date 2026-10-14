/**
 * 데미지 계산 파이프라인
 * ------------------------------------------------------------
 * 순서대로 ctx.value 를 가공합니다. 새 규칙(치명타, 방어력 등)은 단계 객체를 끼워 넣으면 됩니다.
 *   DAMAGE_PIPELINE.splice(idx, 0, { id: 'crit', apply(ctx) { ... } })
 *
 * ctx = { attacker, defender, multiplier, element, fixed?, elements, value, elementMod, relation }
 */
export const DAMAGE_PIPELINE = [
  {
    id: 'base',
    apply(ctx) {
      ctx.value = ctx.fixed ?? ctx.attacker.atk * ctx.multiplier;
    },
  },
  {
    id: 'element',
    apply(ctx) {
      ctx.relation = ctx.elements.relation(ctx.element, ctx.defender.element);
      ctx.elementMod = ctx.fixed != null ? 1 : ctx.elements.damageModifier(ctx.element, ctx.defender.element);
      ctx.value *= ctx.elementMod;
    },
  },
  {
    id: 'dealt',
    apply(ctx) {
      ctx.value *= ctx.attacker.modifier('damageDealt', { element: ctx.element, target: ctx.defender.element });
    },
  },
  {
    id: 'taken',
    apply(ctx) {
      ctx.value *= ctx.defender.modifier('damageTaken', { element: ctx.element });
    },
  },
  {
    id: 'round',
    apply(ctx) {
      ctx.value = Math.max(1, Math.round(ctx.value));
    },
  },
];

export function computeDamage(ctx, pipeline = DAMAGE_PIPELINE) {
  for (const step of pipeline) step.apply(ctx);
  return ctx;
}

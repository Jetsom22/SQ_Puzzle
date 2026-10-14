import { pickTarget } from './Targeting.js';

/**
 * 스킬 효과 레지스트리
 * ------------------------------------------------------------
 * handler(fx, ctx) — fx: skills.js 의 effect 객체, ctx: { battle, caster, allies, enemies, source }
 * 새 효과: registerEffect('shield', async (fx, ctx) => { ... })
 */

/** effect.target 해석 → 대상 유닛 배열 */
export function resolveTargets(spec, ctx) {
  const { who, where } = typeof spec === 'string' ? { who: spec } : spec;
  const { battle, caster, allies, enemies } = ctx;
  const aliveAllies = allies.filter((u) => u.alive);
  const aliveEnemies = enemies.filter((u) => u.alive);
  let list;
  switch (who) {
    case 'self':
      list = [caster];
      break;
    case 'ally':
      list = aliveAllies;
      break;
    case 'allyLowest':
      list = aliveAllies.length ? [aliveAllies.reduce((a, b) => (b.hpRatio < a.hpRatio ? b : a))] : [];
      break;
    case 'allyDead':
      list = allies.filter((u) => !u.alive);
      break;
    case 'enemy': {
      const t = battle.pickTargetFor(caster, enemies);
      list = t ? [t] : [];
      break;
    }
    case 'enemyAll':
      list = aliveEnemies;
      break;
    case 'enemyRandom':
      list = aliveEnemies.length ? [battle.rng.pick(aliveEnemies)] : [];
      break;
    default:
      throw new Error(`알 수 없는 target '${who}'`);
  }
  if (where) list = list.filter((u) => Object.entries(where).every(([k, v]) => u[k] === v));
  return list;
}

function resolveElement(spec, caster) {
  return spec === 'self' || spec == null ? caster.element : spec;
}

export const EFFECTS = {
  /** { target, multiplier, element?, fixed?, percentMaxHp?, lifesteal? } */
  async damage(fx, ctx) {
    const targets = resolveTargets(fx.target ?? 'enemy', ctx);
    for (const t of targets) {
      if (!t.alive) continue;
      await ctx.battle.dealDamage(ctx.caster, t, {
        multiplier: fx.multiplier ?? 1,
        element: resolveElement(fx.element, ctx.caster),
        fixed: fx.fixed ?? (fx.percentMaxHp ? t.maxHp * fx.percentMaxHp : undefined),
        lifesteal: fx.lifesteal,
        source: ctx.source,
      });
    }
  },

  /** { target, percent? | multiplier? } percent = 대상 최대 체력 비율, multiplier = 시전자 공격력 배율 */
  async heal(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'ally', ctx)) {
      const amount = fx.percent ? t.maxHp * fx.percent : ctx.caster.atk * (fx.multiplier ?? 1);
      await ctx.battle.heal(t, amount, ctx.source);
    }
  },

  /** { percent } 사망한 아군 부활 */
  async revive(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'allyDead', ctx)) {
      await ctx.battle.revive(t, fx.percent ?? 0.3);
    }
  },

  /** { target, stat, mult, filter?, duration?, label? } 버프/디버프 */
  async modifier(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'self', ctx)) {
      t.addStatus({
        id: fx.id ?? `${ctx.source}:${fx.stat}:${JSON.stringify(fx.filter ?? {})}`,
        type: 'modifier',
        stat: fx.stat,
        mult: fx.mult,
        filter: fx.filter,
        duration: fx.duration ?? Infinity,
        label: fx.label ?? fx.stat,
      });
      if (fx.stat === 'maxHp') t.recalcMaxHp();
      await ctx.battle.emit('status', { unit: t });
    }
  },

  /** { target, duration } 행동 불가 */
  async stun(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'enemy', ctx)) {
      if (!t.alive) continue;
      t.addStatus({ id: 'stun', type: 'stun', duration: fx.duration ?? 1, label: '기절' });
      await ctx.battle.emit('status', { unit: t });
      ctx.battle.log(`${t.name} 기절!`);
    }
  },

  /** { target, turns } 적 행동 카운트다운 증가 */
  async delay(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'enemyAll', ctx)) {
      if (t.attackInterval) t.countdown += fx.turns ?? 1;
      await ctx.battle.emit('status', { unit: t });
    }
  },

  /** { from: 'any'|'notSelf'|속성id|속성id[], to: 'self'|속성id, count: n|'all' } */
  async convertBoard(fx, ctx) {
    const to = resolveElement(fx.to, ctx.caster);
    await ctx.battle.convertBoard({ from: fx.from ?? 'any', to, count: fx.count ?? 'all', casterElement: ctx.caster.element });
  },

  /** { to: 'self'|속성id } */
  async convertHand(fx, ctx) {
    await ctx.battle.convertHand(resolveElement(fx.to, ctx.caster));
  },

  async refreshBoard(fx, ctx) {
    await ctx.battle.refreshBoard();
  },

  /** { target, amount } 스킬 게이지 충전 */
  async charge(fx, ctx) {
    for (const t of resolveTargets(fx.target ?? 'ally', ctx)) {
      const skill = ctx.battle.skillOf(t);
      if (skill) t.charge = Math.min(skill.cooldown ?? 0, t.charge + (fx.amount ?? 1));
    }
    await ctx.battle.emit('status', {});
  },
};

export function registerEffect(type, handler) {
  EFFECTS[type] = handler;
}

export async function runEffects(effects, ctx) {
  for (const fx of effects ?? []) {
    const handler = EFFECTS[fx.type];
    if (!handler) {
      console.warn(`[Effects] 등록되지 않은 효과 '${fx.type}'`);
      continue;
    }
    await handler(fx, ctx);
  }
}

export { pickTarget };

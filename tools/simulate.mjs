/**
 * 밸런스 시뮬레이터 — 오토 AI 로 N회 전투를 돌려 승률/평균 턴을 출력합니다.
 *   node tools/simulate.mjs [stageId] [runs]
 */
import { GAME_DATA, DEFAULT_RULES } from '../src/config/index.js';
import { Battle } from '../src/core/Battle.js';
import { findBestMove, shouldUseSkill } from '../src/core/AutoPlayer.js';
import { clone } from '../src/core/util.js';

const stageId = process.argv[2] ?? 'story-1-1';
const runs = Number(process.argv[3] ?? 100);

async function play(seed) {
  const battle = new Battle({ data: GAME_DATA, rules: clone(DEFAULT_RULES), stageId, seed });
  await battle.start();
  let guard = 0;
  while (battle.phase === 'input' && guard++ < 500) {
    for (const u of battle.team) if (shouldUseSkill(battle, u)) await battle.useSkill(u.slot);
    if (battle.phase !== 'input') break;
    const best = findBestMove(battle);
    if (!best?.move) break;
    await battle.place(best.move.handIndex, best.move.r, best.move.c);
  }
  return battle;
}

let wins = 0;
let turns = 0;
let waveSum = 0;
const reasons = {};
for (let i = 1; i <= runs; i++) {
  const b = await play(i);
  if (b.result?.result === 'victory') {
    wins++;
    turns += b.turn;
  } else {
    reasons[b.result?.reason ?? '?'] = (reasons[b.result?.reason ?? '?'] ?? 0) + 1;
  }
  waveSum += b.waveIndex + 1;
}
console.log(`[${stageId}] ${runs}회 — 승률 ${((wins / runs) * 100).toFixed(1)}%, 승리 평균 턴 ${(turns / Math.max(1, wins)).toFixed(1)}, 평균 도달 웨이브 ${(waveSum / runs).toFixed(2)}`);
if (Object.keys(reasons).length) console.log('  패배 사유:', reasons);

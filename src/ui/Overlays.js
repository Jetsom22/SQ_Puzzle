import { h } from './dom.js';

/** 결과 화면 */
export function resultOverlay(battle, { onRetry, onRules }) {
  const win = battle.result.result === 'victory';
  const s = battle.stats;
  return h(
    'div',
    { class: 'overlay' },
    h(
      'div',
      { class: `modal${win ? '' : ' lose'}`, role: 'dialog', 'aria-label': win ? '승리' : '패배' },
      h('h2', {}, win ? 'VICTORY' : 'DEFEAT'),
      h('div', { class: 'reason' }, battle.result.reason),
      h(
        'div',
        { class: 'stats' },
        stat('사용 턴', `${battle.turn} / ${battle.turnLimit}`),
        stat('도달 웨이브', `${battle.waveIndex + 1} / ${battle.waveCount}`),
        stat('준 피해', s.damageDealt.toLocaleString()),
        stat('받은 피해', s.damageTaken.toLocaleString()),
        stat('완성한 라인', s.lines),
        stat('최고 배율', `x${s.bestMultiplier}`),
      ),
      h('div', { class: 'row' }, h('button', { class: 'btn on', onClick: onRetry }, '다시 하기'), h('button', { class: 'btn', onClick: onRules }, '규칙 편집')),
    ),
  );
}

function stat(k, v) {
  return h('div', {}, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
}

/** 규칙 편집 패널 — RULES / 상성표를 JSON 으로 수정 후 재시작 */
export function devOverlay({ stages, stageId, seed, rulesJson, chartJson, onApply, onReset, onClose }) {
  const err = h('div', { class: 'err' });
  const stageSel = h(
    'select',
    { class: 'select', id: 'dev-stage' },
    Object.entries(stages).map(([id, s]) => h('option', { value: id, selected: id === stageId }, s.name)),
  );
  const seedIn = h('input', { id: 'dev-seed', placeholder: '비우면 랜덤', value: seed ?? '' });
  const rulesTa = h('textarea', { id: 'dev-rules', spellcheck: 'false' });
  rulesTa.value = rulesJson;
  const chartTa = h('textarea', { id: 'dev-chart', spellcheck: 'false' });
  chartTa.value = chartJson;
  const apply = () => {
    try {
      const rules = JSON.parse(rulesTa.value);
      const chart = JSON.parse(chartTa.value);
      const s = seedIn.value.trim();
      onApply({ stageId: stageSel.value, seed: s ? Number(s) : null, rules, chart });
    } catch (e) {
      err.textContent = `JSON 형식 오류: ${e.message}`;
    }
  };
  const ov = h(
    'div',
    { class: 'overlay' },
    h(
      'div',
      { class: 'dev', role: 'dialog', 'aria-label': '규칙 편집' },
      h(
        'div',
        {},
        h('h2', {}, '규칙 편집'),
        h('p', { class: 'note' }, '값을 바꾸고 [적용 후 재시작]을 누르면 바로 반영됩니다. 영구 반영은 src/config/rules.js · elements.js 를 수정하세요. 이 브라우저에만 저장됩니다.'),
      ),
      h('div', { class: 'opts' }, h('label', {}, '스테이지', stageSel), h('label', {}, '시드 (재현용)', seedIn)),
      h(
        'div',
        { class: 'editors' },
        h('div', { class: 'ed' }, h('label', { for: 'dev-rules' }, 'RULES (rules.js)'), rulesTa),
        h('div', { class: 'ed' }, h('label', { for: 'dev-chart' }, 'ELEMENT_CHART (elements.js)'), chartTa),
      ),
      h(
        'div',
        { class: 'foot' },
        err,
        h(
          'div',
          { class: 'row', style: { display: 'flex', gap: '10px' } },
          h('button', { class: 'btn', onClick: onReset }, '기본값으로'),
          h('button', { class: 'btn', onClick: onClose }, '닫기'),
          h('button', { class: 'btn on', onClick: apply }, '적용 후 재시작'),
        ),
      ),
    ),
  );
  ov.addEventListener('keydown', (e) => e.stopPropagation());
  return ov;
}

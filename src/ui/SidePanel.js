import { h } from './dom.js';
import { iconSvg } from './icons.js';

const DIR_NAME = { horizontal: '가로', vertical: '세로', diagonal: '대각선', antiDiagonal: '대각선' };

/** 우측 정보 패널: 배율 미리보기, 상성표, 전투 로그, 조작키 */
export class SidePanel {
  constructor(app) {
    this.app = app;
    this.el = h('aside', { class: 'panel side', 'aria-label': '전투 정보' });
    this.scoreTitle = h('h3', {}, '이번 턴 배율');
    this.scoreGrid = h('div', { class: 'score-grid' });
    this.scoreLines = h('div', { class: 'score-lines' });
    this.chartEl = h('div', { class: 'chart-wrap' });
    this.logEl = h('div', { class: 'log', 'aria-live': 'polite' });
    this.el.append(
      h('div', { class: 'side-box' }, this.scoreTitle, this.scoreGrid, this.scoreLines),
      h('div', { class: 'side-box' }, h('h3', {}, '속성 상성'), this.chartEl),
      h('div', { class: 'side-box log-wrap' }, h('h3', {}, '전투 기록'), this.logEl),
      h(
        'div',
        { class: 'keys' },
        h('span', { class: 'kbd' }, '1–4'), '손패 선택 · 드래그/클릭으로 배치',
        h('span', { class: 'kbd' }, 'Q W E R T'), '캐릭터 스킬',
        h('span', { class: 'kbd' }, 'Space'), '추천 수 바로 두기',
        h('span', { class: 'kbd' }, '우클릭 · Z'), '배치 되돌리기',
        h('span', { class: 'kbd' }, '적 클릭'), '집중 공격 대상 지정',
      ),
    );
  }

  get battle() {
    return this.app.battle;
  }

  build() {
    this.logEl.replaceChildren();
    this.renderChart();
    this.preview(null);
  }

  renderChart() {
    const els = this.battle.elements;
    const list = els.list;
    const n = list.length;
    const R = 42;
    const pos = list.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { x: 60 + R * Math.cos(a), y: 60 + R * Math.sin(a) };
    });
    let arrows = '';
    list.forEach((a, i) => {
      for (const target of els.chart.strongAgainst[a.id] ?? []) {
        const j = list.findIndex((e) => e.id === target);
        if (j < 0) continue;
        const p = pos[i];
        const q = pos[j];
        const t1 = 0.3;
        const t2 = 0.7;
        arrows += `<line x1="${p.x + (q.x - p.x) * t1}" y1="${p.y + (q.y - p.y) * t1}" x2="${p.x + (q.x - p.x) * t2}" y2="${p.y + (q.y - p.y) * t2}" stroke="${a.color}" stroke-width="3" marker-end="url(#ah-${a.id})"/>`;
      }
    });
    const markers = list
      .map((e) => `<marker id="ah-${e.id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${e.color}"/></marker>`)
      .join('');
    const nodes = list
      .map((e, i) => `<circle cx="${pos[i].x}" cy="${pos[i].y}" r="15" fill="${e.color}" stroke="#1c1310" stroke-width="2"/><g transform="translate(${pos[i].x - 9} ${pos[i].y - 9}) scale(.75)" fill="#fff">${iconSvg(e.icon).replace(/<\/?svg[^>]*>/g, '')}</g>`)
      .join('');
    const svg = `<svg viewBox="0 0 120 120" role="img" aria-label="속성 상성도"><defs>${markers}</defs>${arrows}${nodes}</svg>`;
    const c = els.chart;
    const pairs = list
      .map((a) => (c.strongAgainst[a.id] ?? []).map((t) => `<b style="color:${a.color}">${a.name}</b> → ${els.get(t)?.name}`).join(', '))
      .filter(Boolean)
      .join('<br>');
    this.chartEl.innerHTML = `${svg}<div class="chart-text">${pairs}<br>유리: 피해 +${Math.round(c.advantageDamageBonus * 100)}%<br>불리: 피해 −${Math.round(c.advantageDamageReduction * 100)}%</div>`;
  }

  /** score: scoreTurn 결과 (null 이면 현재 배치 기준) */
  preview(score, title) {
    const b = this.battle;
    const s = score ?? b.previewScore();
    this.scoreTitle.replaceChildren(title ?? '이번 턴 배율');
    if (score && !title) this.scoreTitle.append(h('small', {}, '미리보기'));
    this.scoreGrid.replaceChildren(
      ...b.elements.list.map((e) => {
        const m = s.byElement[e.id] ?? 0;
        return h(
          'div',
          { class: `score-el${m ? ' active' : ''}`, '--c': e.color },
          h('span', { class: 'sw', html: iconSvg(e.icon) }),
          e.name,
          h('span', { class: `n${m ? '' : ' zero'}` }, `x${m}`),
        );
      }),
    );
    this.scoreLines.textContent = s.lines.length
      ? s.lines.map((l) => `${b.elements.get(l.element).name} ${DIR_NAME[l.direction] ?? l.direction} ${l.length}연결 x${l.multiplier}`).join(' · ')
      : '같은 속성 3개 이상을 가로·세로·대각선으로 이으면 라인 보너스';
  }

  log(text, kind = 'info') {
    this.logEl.append(h('p', { class: kind }, text));
    while (this.logEl.children.length > 120) this.logEl.firstChild.remove();
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
}

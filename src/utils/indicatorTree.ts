import type { Indicator } from '../types';

export interface IndicatorScore {
  indicator_id: number;
  score_raw: number;
  score_standardized: number | null;
}

export interface LeafNode {
  kind: 'leaf';
  indicator: Indicator;
  score: IndicatorScore;
}

export interface ParentNode {
  kind: 'parent';
  indicator: Indicator;
  children: LeafNode[];
  avgRaw: number;
  avgStd: number | null;
}

export interface SystemNode {
  kind: 'system';
  system: string;
  label: string;
  children: (ParentNode | LeafNode)[];
  avgRaw: number;
  avgStd: number | null;
}

const SYSTEM_LABELS: Record<string, string> = {
  motivation: '动力系统',
  regulation: '调控系统',
  execution: '执行系统',
};

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function avgNullable(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null);
  return valid.length ? avg(valid) : null;
}

/** Build a 3-level tree: system → parent → leaf */
export function buildIndicatorTree(
  indicators: Indicator[],
  scores: IndicatorScore[],
): SystemNode[] {
  const scoreMap = new Map(scores.map(s => [s.indicator_id, s]));

  // Separate parents and leaves
  const parents = indicators.filter(i => i.is_leaf === 0);
  const leaves = indicators.filter(i => i.is_leaf === 1);

  // Build parent nodes
  const parentNodes = new Map<number, ParentNode>();
  for (const p of parents) {
    const children: LeafNode[] = leaves
      .filter(l => l.parent_id === p.id)
      .map(l => ({ kind: 'leaf' as const, indicator: l, score: scoreMap.get(l.id)! }))
      .filter(n => n.score != null);

    if (children.length === 0) continue;

    parentNodes.set(p.id, {
      kind: 'parent',
      indicator: p,
      children,
      avgRaw: avg(children.map(c => c.score.score_raw)),
      avgStd: avgNullable(children.map(c => c.score.score_standardized)),
    });
  }

  // Leaves with no parent (direct children of system)
  const orphanLeaves = leaves
    .filter(l => l.parent_id === null || !parentNodes.has(l.parent_id!))
    .map(l => ({ kind: 'leaf' as const, indicator: l, score: scoreMap.get(l.id)! }))
    .filter(n => n.score != null);

  // Group by system
  const systemMap = new Map<string, (ParentNode | LeafNode)[]>();
  for (const pn of parentNodes.values()) {
    const sys = pn.indicator.system ?? 'other';
    if (!systemMap.has(sys)) systemMap.set(sys, []);
    systemMap.get(sys)!.push(pn);
  }
  for (const ln of orphanLeaves) {
    const sys = ln.indicator.system ?? 'other';
    if (!systemMap.has(sys)) systemMap.set(sys, []);
    systemMap.get(sys)!.push(ln);
  }

  const systemOrder = ['motivation', 'regulation', 'execution'];
  return [...systemMap.entries()]
    .sort((a, b) => systemOrder.indexOf(a[0]) - systemOrder.indexOf(b[0]))
    .map(([sys, children]) => {
      const allLeaves = children.flatMap(c =>
        c.kind === 'parent' ? c.children : [c]
      );
      return {
        kind: 'system',
        system: sys,
        label: SYSTEM_LABELS[sys] ?? sys,
        children,
        avgRaw: avg(allLeaves.map(l => l.score.score_raw)),
        avgStd: avgNullable(allLeaves.map(l => l.score.score_standardized)),
      };
    });
}

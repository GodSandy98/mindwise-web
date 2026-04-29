import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getExamScores, computeScores } from '../api/scores';
import { getExam } from '../api/exams';
import { getStudents } from '../api/students';
import { getIndicators } from '../api/indicators';
import ScoreBar from '../components/ScoreBar';
import { useAuth } from '../context/AuthContext';
import { buildIndicatorTree } from '../utils/indicatorTree';
import type { SystemNode, ParentNode, LeafNode } from '../utils/indicatorTree';
import type { Indicator } from '../types';

const CAN_COMPUTE = ['super_admin', 'admin_teacher'];

// ── Helpers ───────────────────────────────────────────────────────────────────

type StudentScores = Map<number, { raw: number; std: number | null }>;

function avgStudentScores(map: StudentScores, ids: number[]) {
  const vals = ids.map(id => map.get(id)).filter(Boolean) as { raw: number; std: number | null }[];
  if (!vals.length) return null;
  const stdVals = vals.map(v => v.std).filter((v): v is number => v !== null);
  return { std: stdVals.length ? stdVals.reduce((a, b) => a + b, 0) / stdVals.length : null };
}

function leafIds(node: ParentNode | LeafNode): number[] {
  return node.kind === 'leaf' ? [node.indicator.id] : node.children.map(c => c.indicator.id);
}
function allLeafIds(sys: SystemNode): number[] {
  return sys.children.flatMap(leafIds);
}

// ── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExamScoresPage() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);
  const { user } = useAuth();

  const { data: exam } = useQuery({ queryKey: ['exam', examId], queryFn: () => getExam(examId) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });
  const { data: indicators = [] } = useQuery({ queryKey: ['indicators'], queryFn: getIndicators });
  const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));

  const { data: scores, refetch, isLoading } = useQuery({
    queryKey: ['exam-scores', examId],
    queryFn: () => getExamScores(examId),
    retry: false,
  });

  const compute = useMutation({
    mutationFn: () => computeScores(examId),
    onSuccess: () => refetch(),
  });

  const dummyScores = indicators.filter(i => i.is_leaf === 1).map(i => ({
    indicator_id: i.id, score_raw: 0, score_standardized: 0,
  }));
  const treeTemplate = buildIndicatorTree(indicators as Indicator[], dummyScores);

  // "closed" sets — empty by default means everything is open
  const [closedSystems, setClosedSystems] = useState<Set<string>>(new Set());
  const [closedParents, setClosedParents] = useState<Set<number>>(new Set());

  function toggleSystem(sys: string) {
    setClosedSystems(prev => { const s = new Set(prev); s.has(sys) ? s.delete(sys) : s.add(sys); return s; });
  }
  function toggleParent(id: number) {
    setClosedParents(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  const canCompute = CAN_COMPUTE.includes(user?.role ?? '');

  if (!scores || scores.results.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <PageHeader exam={exam} compute={compute} canCompute={canCompute} />
        {isLoading
          ? <p className="text-gray-400 text-sm">加载中…</p>
          : <p className="text-gray-400 text-sm text-center py-16">
              暂无得分数据{canCompute ? '，请先点击「重新计算得分」' : '，请联系管理教师进行计算'}
            </p>
        }
      </div>
    );
  }

  const studentIds = scores.results.map(r => r.student_id);
  const studentScoreMaps = new Map<number, StudentScores>(
    scores.results.map(r => [
      r.student_id,
      new Map(r.indicator_scores.map(s => [s.indicator_id, { raw: s.score_raw, std: s.score_standardized }])),
    ])
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader exam={exam} compute={compute} canCompute={canCompute} />

      <div className="rounded-xl border border-gray-200 shadow-sm overflow-x-auto bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[10rem] whitespace-nowrap">
                指标
              </th>
              {studentIds.map(sid => (
                <th key={sid} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap min-w-[9rem]">
                  {studentMap[sid] ?? `学生${sid}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {treeTemplate.map(sysNode => {
              const sysOpen = !closedSystems.has(sysNode.system);
              return (
                <>
                  {/* ── System row ── */}
                  <tr
                    key={`sys-${sysNode.system}`}
                    className="border-b border-gray-100 bg-indigo-50 cursor-pointer select-none hover:bg-indigo-100/70 transition-colors"
                    onClick={() => toggleSystem(sysNode.system)}
                  >
                    <td className="sticky left-0 z-10 bg-indigo-50 px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-400"><Chevron open={sysOpen} /></span>
                        <span className="text-sm font-semibold text-indigo-800">{sysNode.label}</span>
                      </div>
                    </td>
                    {studentIds.map(sid => {
                      const agg = avgStudentScores(studentScoreMaps.get(sid)!, allLeafIds(sysNode));
                      return (
                        <td key={sid} className="px-4 py-3 min-w-[9rem]">
                          <ScoreBar score={agg?.std ?? null} />
                        </td>
                      );
                    })}
                  </tr>

                  {sysOpen && sysNode.children.map(child => {
                    if (child.kind === 'leaf') {
                      return (
                        <tr key={`leaf-${child.indicator.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2 pl-6">
                              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{child.indicator.name}</span>
                            </div>
                          </td>
                          {studentIds.map(sid => {
                            const sc = studentScoreMaps.get(sid)!.get(child.indicator.id) ?? null;
                            return (
                              <td key={sid} className="px-4 py-2.5 min-w-[9rem]">
                                <ScoreBar score={sc?.std ?? null} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }

                    // ── Parent row ──
                    const pOpen = !closedParents.has(child.indicator.id);
                    return (
                      <>
                        <tr
                          key={`parent-${child.indicator.id}`}
                          className="border-b border-gray-100 bg-gray-50/80 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                          onClick={() => toggleParent(child.indicator.id)}
                        >
                          <td className="sticky left-0 z-10 bg-gray-50/80 px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-gray-400"><Chevron open={pOpen} /></span>
                              <span className="text-sm font-medium text-gray-700">{child.indicator.name}</span>
                            </div>
                          </td>
                          {studentIds.map(sid => {
                            const agg = avgStudentScores(studentScoreMaps.get(sid)!, leafIds(child));
                            return (
                              <td key={sid} className="px-4 py-2.5 min-w-[9rem]">
                                <ScoreBar score={agg?.std ?? null} />
                              </td>
                            );
                          })}
                        </tr>

                        {pOpen && child.children.map(leaf => (
                          <tr key={`leaf-${leaf.indicator.id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-2 pl-12">
                                <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{leaf.indicator.name}</span>
                              </div>
                            </td>
                            {studentIds.map(sid => {
                              const sc = studentScoreMaps.get(sid)!.get(leaf.indicator.id) ?? null;
                              return (
                                <td key={sid} className="px-4 py-2.5 min-w-[9rem]">
                                  <ScoreBar score={sc?.std ?? null} />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageHeader({ exam, compute, canCompute }: { exam: any; compute: any; canCompute: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{exam?.name ?? '考试得分'}</h1>
        <p className="text-sm text-gray-400 mt-0.5">全班标准化得分总览</p>
      </div>
      {canCompute && (
        <button
          onClick={() => compute.mutate()}
          disabled={compute.isLoading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {compute.isLoading ? '计算中…' : '重新计算得分'}
        </button>
      )}
    </div>
  );
}

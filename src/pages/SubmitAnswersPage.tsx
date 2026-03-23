import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { submitAnswers } from '../api/answers';
import { getStudents } from '../api/students';
import { getExam } from '../api/exams';

export default function SubmitAnswersPage() {
  const { id } = useParams<{ id: string }>();
  const examId = Number(id);
  const navigate = useNavigate();

  const { data: exam } = useQuery({ queryKey: ['exam', examId], queryFn: () => getExam(examId) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: getStudents });

  const [studentId, setStudentId] = useState<number | ''>('');
  const [answersJson, setAnswersJson] = useState('');
  const [error, setError] = useState('');

  const submit = useMutation({
    mutationFn: submitAnswers,
    onSuccess: () => {
      navigate(`/exams/${examId}/scores`);
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? '提交失败'),
  });

  function handleSubmit() {
    setError('');
    if (!studentId) { setError('请选择学生'); return; }
    let answers;
    try {
      answers = JSON.parse(answersJson);
    } catch {
      setError('答案格式不正确，请输入合法 JSON 数组');
      return;
    }
    submit.mutate({ student_id: Number(studentId), exam_id: examId, answers });
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">提交答卷</h1>
      {exam && <p className="text-gray-500 text-sm mb-6">{exam.name}</p>}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择学生</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={studentId}
            onChange={e => setStudentId(Number(e.target.value))}
          >
            <option value="">-- 请选择 --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}（{s.class_name}）</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            答案（JSON 数组，格式：<code className="bg-gray-100 px-1 rounded text-xs">[{'{'}&#34;question_id&#34;: 1, &#34;answer&#34;: 3{'}'},…]</code>）
          </label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm font-mono h-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder='[{"question_id": 1, "answer": 3}, ...]'
            value={answersJson}
            onChange={e => setAnswersJson(e.target.value)}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submit.isLoading}
          className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {submit.isLoading ? '提交中…' : '提交答卷'}
        </button>
      </div>
    </div>
  );
}

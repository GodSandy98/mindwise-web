import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  admin_teacher: '管理教师',
  psych_teacher: '心理教师',
  class_teacher: '班主任',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/students', label: '学生' },
    { to: '/exams', label: '考试' },
    ...(user?.role === 'super_admin' ? [{ to: '/admin', label: '系统管理' }] : []),
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-indigo-700 text-white px-6 py-3 flex items-center gap-6 shadow">
      <span className="font-bold text-lg tracking-wide mr-4">MindWise</span>
      {links.map(l => (
        <Link
          key={l.to}
          to={l.to}
          className={`text-sm font-medium hover:text-indigo-200 transition-colors ${pathname.startsWith(l.to) ? 'underline underline-offset-4' : ''}`}
        >
          {l.label}
        </Link>
      ))}
      {user && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs bg-indigo-600 px-2 py-0.5 rounded-full">{ROLE_LABELS[user.role]}</span>
          <span className="text-sm">{user.name}</span>
          <button onClick={handleLogout} className="text-sm text-indigo-200 hover:text-white">退出</button>
        </div>
      )}
    </nav>
  );
}

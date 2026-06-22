import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, User, Lock } from 'lucide-react';
import { Input, Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('用户名或密码错误');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 49px, #f97316 49px, #f97316 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, #f97316 49px, #f97316 50px)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-industrial-orange rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-industrial-orange/20">
              <Package size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              五金建材店管理系统
            </h1>
            <p className="text-sm text-slate-400 mt-1">Hardware Store Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm px-4 py-2.5 rounded-md">
                {error}
              </div>
            )}

            <Input
              label="用户名"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              prefix={User}
              autoComplete="username"
            />

            <Input
              label="密码"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefix={Lock}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="warning"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50">
            <p className="text-center text-xs text-slate-500">
              默认账号: admin / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

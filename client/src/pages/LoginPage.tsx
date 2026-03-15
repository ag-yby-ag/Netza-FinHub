import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'E-mail ou senha inválidos';
      setError(message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — dark brand panel */}
      <div className="hidden lg:flex w-[40%] bg-dark relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Radial gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 opacity-[0.08]"
          style={{ background: 'radial-gradient(circle at top right, #6DED67, transparent 70%)' }} />

        <div className="relative text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center">
              <span className="font-display font-black text-dark text-xl">N</span>
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-white text-2xl leading-none">
                NETZA<span className="text-brand">&</span>CO
              </div>
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-[0.12em] mt-1">FINHUB</div>
            </div>
          </div>

          <h2 className="font-display font-bold text-white text-2xl mb-3 tracking-[-0.03em]">
            Procurement inteligente
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
            Onde o procurement se conecta.
          </p>

          {/* Features */}
          <div className="mt-10 grid gap-3 text-left">
            {[
              'Gestão de fornecedores B2B',
              'Orçamentos com aprovação em 1 clique',
              'Analytics com IA integrada',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                </div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 font-mono text-[10px] text-gray-600 tracking-widest">
          NETZA&CO © 2026 — FinHub v1.0
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 bg-surface flex items-center justify-center p-6">
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] bg-white rounded-card p-10 shadow-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="font-display font-black text-dark text-sm">N</span>
            </div>
            <div className="font-display font-bold text-dark text-lg">
              NETZA<span className="text-brand">&</span>CO
            </div>
          </div>

          <h1 className="title-display text-[28px] text-dark mb-1">Entrar</h1>
          <p className="text-gray-400 text-[13px] mb-8">Acesse o ecossistema de fornecedores</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label-mono block mb-1.5">E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="input-base bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label-mono block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="input-base bg-gray-50 focus:bg-white pr-10"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand" />
                <span className="text-sm text-gray-600">Lembrar de mim</span>
              </label>
              <button type="button" className="text-sm text-brand hover:text-brand-dark transition-colors">
                Esqueci minha senha
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-error text-sm bg-red-50 px-4 py-2.5 rounded-input">
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn-primary w-full h-12 text-base disabled:opacity-70">
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Entrando...</>
              ) : 'Entrar'}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button type="button"
              className="btn-secondary w-full h-12 text-sm opacity-60 cursor-not-allowed">
              Entrar com SSO
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="font-mono text-[10px] text-gray-400">NETZA&CO © 2026 — FinHub v1.0</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

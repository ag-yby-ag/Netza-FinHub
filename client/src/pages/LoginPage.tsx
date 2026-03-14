import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] dark:bg-[#0D0D0D]">
      {/* Background accent */}
      <div
        className="pointer-events-none fixed left-0 top-0 h-full w-full"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(109,237,103,0.06) 0%, transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[420px] px-4"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-['Space_Grotesk'] text-3xl font-bold">
            <span className="text-[#0D0D0D] dark:text-white">NETZA</span>
            <span className="text-[#6DED67]">&amp;</span>
            <span className="text-[#0D0D0D] dark:text-white">CO</span>
          </h1>
          <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-[0.15em] text-[#737373]">
            FINHUB
          </span>
        </div>

        {/* Card */}
        <div className="rounded-[20px] border border-[#E5E5E5] bg-white p-8 dark:border-[rgba(255,255,255,0.06)] dark:bg-[#141414]">
          <h2 className="mb-1 font-['Space_Grotesk'] text-xl font-bold text-[#0D0D0D] dark:text-white">
            Bem-vindo de volta
          </h2>
          <p className="mb-6 font-['Plus_Jakarta_Sans'] text-sm text-[#737373] dark:text-[#A3A3A3]">
            Entre com suas credenciais para acessar a plataforma
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/20"
            >
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <p className="font-['Plus_Jakarta_Sans'] text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373] dark:text-[#A3A3A3]">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[0.08em] text-[#737373] dark:text-[#A3A3A3]">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2.5 pr-10 font-['Plus_Jakarta_Sans'] text-sm text-[#0D0D0D] outline-none transition-colors focus:border-[#6DED67] dark:border-[#404040] dark:bg-[#1A1A1A] dark:text-white dark:focus:border-[#6DED67]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#737373]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-[#6DED67] py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#0D0D0D] transition-colors hover:bg-[#4BA846] disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center font-['JetBrains_Mono'] text-[10px] text-[#737373]">
            Demo: vinicius@netzaco.com.br · admin123
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, FileText, Upload, X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface SearchResults {
  suppliers: Array<{ id: number; name: string; category: string; rating: number }>;
  quotes: Array<{ id: number; item_description: string; total_price: number; supplier_name: string }>;
  uploads: Array<{ id: number; original_name: string; rows_total: number; status: string }>;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setResults(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.get(`/search/global?q=${encodeURIComponent(q)}`);
      setResults(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const navigate_ = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const totalResults = results
    ? results.suppliers.length + results.quotes.length + results.uploads.length
    : 0;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh]"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-[560px] mx-4 bg-white dark:bg-dark-card rounded-card shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleChange}
                placeholder="Buscar fornecedores, orçamentos, uploads..."
                className="flex-1 bg-transparent text-sm text-dark dark:text-white placeholder-gray-400 outline-none"
              />
              {loading && (
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              {query && !loading && (
                <button
                  onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono border border-gray-200 dark:border-white/10 flex-shrink-0">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto">
              {!query && (
                <div className="py-10 text-center">
                  <Search size={24} className="text-gray-300 dark:text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Digite para buscar</p>
                  <p className="text-xs text-gray-300 dark:text-white/30 mt-1">
                    Fornecedores, orçamentos e uploads
                  </p>
                </div>
              )}

              {query && !loading && totalResults === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">Nenhum resultado para "{query}"</p>
                </div>
              )}

              {results && (
                <>
                  {results.suppliers.length > 0 && (
                    <div>
                      <div className="px-4 py-2 label-mono border-b border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                        Fornecedores
                      </div>
                      {results.suppliers.map(s => (
                        <button
                          key={s.id}
                          onClick={() => navigate_(`/suppliers/${s.id}`)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <Users size={15} className="text-brand-dark dark:text-brand" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-dark dark:text-white truncate">{s.name}</div>
                            <div className="text-xs text-gray-400">{s.category} · ★ {Number(s.rating).toFixed(1)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.quotes.length > 0 && (
                    <div>
                      <div className="px-4 py-2 label-mono border-b border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                        Orçamentos
                      </div>
                      {results.quotes.map(q => (
                        <button
                          key={q.id}
                          onClick={() => navigate_('/quotes')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText size={15} className="text-info" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-dark dark:text-white truncate">{q.item_description}</div>
                            <div className="text-xs text-gray-400">{q.supplier_name} · {formatCurrency(q.total_price)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.uploads.length > 0 && (
                    <div>
                      <div className="px-4 py-2 label-mono border-b border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                        Uploads
                      </div>
                      {results.uploads.map(u => (
                        <button
                          key={u.id}
                          onClick={() => navigate_('/upload')}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-brand/10 flex items-center justify-center flex-shrink-0">
                            <Upload size={15} className="text-brand-dark dark:text-brand" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-dark dark:text-white truncate">{u.original_name}</div>
                            <div className="text-xs text-gray-400">{u.rows_total} registros · {u.status}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {query && totalResults > 0 ? `${totalResults} resultado${totalResults !== 1 ? 's' : ''}` : 'Ctrl+K para abrir'}
              </span>
              <button
                onClick={() => {
                  if (query.trim()) {
                    navigate_(`/search?q=${encodeURIComponent(query)}`);
                  }
                }}
                className="text-[10px] text-brand-dark dark:text-brand font-semibold hover:underline"
              >
                {query.trim() ? 'Ver todos os resultados →' : ''}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Compact trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 bg-gray-100 dark:bg-white/10 border border-transparent hover:border-brand/50 rounded-input text-sm text-gray-400 transition-all group min-w-[160px] max-w-xs"
      >
        <Search size={15} className="flex-shrink-0" />
        <span className="flex-1 text-left truncate">Buscar...</span>
        <kbd className="hidden md:flex items-center gap-0.5 text-[10px] bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono border border-gray-200 dark:border-white/20 group-hover:border-brand/40 transition-colors">
          <Command size={8} />K
        </kbd>
      </button>

      {/* Overlay portal */}
      {createPortal(overlay, document.body)}
    </>
  );
}

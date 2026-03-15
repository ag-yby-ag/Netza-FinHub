import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, FileText, Upload, X } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    setQuery('');
    setResults(null);
  };

  const hasResults = results && (results.suppliers.length + results.quotes.length + results.uploads.length) > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder="Buscar... (Ctrl+K)"
          className="w-full h-10 pl-9 pr-10 bg-gray-100 dark:bg-white/10 border border-transparent focus:border-brand rounded-input text-sm text-dark dark:text-white placeholder-gray-400 outline-none transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-full mt-1.5 w-full card-base shadow-lg z-50 overflow-hidden"
          >
            {loading && (
              <div className="py-4 px-5 text-sm text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-brand border-t-transparent rounded-full animate-spin" />
                Buscando...
              </div>
            )}

            {!loading && !hasResults && query && (
              <div className="py-6 px-5 text-center text-sm text-gray-400">
                Nenhum resultado para "{query}"
              </div>
            )}

            {!loading && results && (
              <>
                {results.suppliers.length > 0 && (
                  <div>
                    <div className="label-mono px-5 py-2.5 border-b border-gray-100 dark:border-white/5">Fornecedores</div>
                    {results.suppliers.map(s => (
                      <button key={s.id} onClick={() => navigate_(`/suppliers/${s.id}`)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                          <Users size={14} className="text-brand-dark" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-dark dark:text-white">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.category} — ★ {s.rating}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.quotes.length > 0 && (
                  <div>
                    <div className="label-mono px-5 py-2.5 border-b border-gray-100 dark:border-white/5 border-t border-t-gray-100 dark:border-t-white/5">Orçamentos</div>
                    {results.quotes.map(q => (
                      <button key={q.id} onClick={() => navigate_(`/quotes`)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                          <FileText size={14} className="text-info" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-dark dark:text-white">{q.item_description}</div>
                          <div className="text-xs text-gray-400">{q.supplier_name} — {formatCurrency(q.total_price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results.uploads.length > 0 && (
                  <div>
                    <div className="label-mono px-5 py-2.5 border-b border-gray-100 dark:border-white/5 border-t border-t-gray-100 dark:border-t-white/5">Uploads</div>
                    {results.uploads.map(u => (
                      <button key={u.id} onClick={() => navigate_('/upload')}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                          <Upload size={14} className="text-brand-dark" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-dark dark:text-white">{u.original_name}</div>
                          <div className="text-xs text-gray-400">{u.rows_total} registros — {u.status}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

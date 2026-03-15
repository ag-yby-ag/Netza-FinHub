import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Lightbulb, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

interface Insight {
  insight: string;
  highlights: string[];
  recommendations: string[];
}

type AnalysisType = 'supplier_comparison' | 'cost_analysis' | 'risk_alert' | 'general_insight' | 'category_analysis';

interface Props {
  type?: AnalysisType;
  contextId?: string;
  className?: string;
  variant?: 'green' | 'white';
}

export default function AIInsightCard({ type = 'general_insight', contextId, className = '', variant = 'green' }: Props) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await api.post('/ai/analyze', { type, context_id: contextId, force_refresh: forceRefresh });
      setInsight(res.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInsight(); }, [type, contextId]);

  if (variant === 'white') {
    return (
      <div className={`card-base p-5 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-brand" />
            <span className="label-mono">IA Insight</span>
          </div>
          <button onClick={() => fetchInsight(true)} disabled={loading} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {loading && !insight && <div className="h-16 bg-gray-100 dark:bg-white/5 rounded-input animate-pulse" />}
        {insight && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{insight.insight}</p>
            {insight.highlights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {insight.highlights.map((h, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 bg-brand-subtle text-brand-dark rounded-pill font-medium">{h}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-brand rounded-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-dark/70" />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dark/60 font-semibold">IA Insight</span>
        </div>
        <button
          onClick={() => fetchInsight(true)}
          disabled={loading}
          className="p-1 rounded hover:bg-dark/10 text-dark/60 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading && !insight && (
          <div className="space-y-2">
            <div className="h-3 bg-dark/10 rounded animate-pulse" />
            <div className="h-3 bg-dark/10 rounded w-4/5 animate-pulse" />
            <div className="h-3 bg-dark/10 rounded w-2/3 animate-pulse" />
          </div>
        )}

        {insight && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-dark/80 text-sm leading-relaxed mb-4">{insight.insight}</p>

            {insight.recommendations.length > 0 && (
              <div className="space-y-1.5">
                {insight.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle size={13} className="text-dark/50 mt-0.5 flex-shrink-0" />
                    <span className="text-dark/70 text-xs leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

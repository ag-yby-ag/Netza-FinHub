import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, FileText, Users, AlertTriangle, Cpu, Settings } from 'lucide-react';
import api from '../../lib/api';
import { formatRelativeTime } from '../../lib/utils';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: number;
  created_at: string;
}

const ICONS: Record<string, React.ReactNode> = {
  quote_expiring: <Clock size={16} className="text-warning" />,
  quote_approved: <CheckCircle size={16} className="text-brand-dark" />,
  quote_rejected: <XCircle size={16} className="text-error" />,
  upload_completed: <FileText size={16} className="text-info" />,
  upload_error: <FileText size={16} className="text-error" />,
  supplier_created: <Users size={16} className="text-brand-dark" />,
  supplier_risk_change: <AlertTriangle size={16} className="text-warning" />,
  ai_insight_ready: <Cpu size={16} className="text-brand" />,
  system_alert: <Settings size={16} className="text-gray-400" />,
};

interface Props {
  onClose: () => void;
  onMarkAllRead: () => void;
}

export default function NotificationDropdown({ onClose, onMarkAllRead }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/notifications?limit=10').then(r => setNotifications(r.data.data)).catch(() => {});
  }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    onMarkAllRead();
  };

  const handleClick = async (n: Notification) => {
    await markRead(n.id);
    if (n.link) { navigate(n.link); onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[380px] card-base shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
        <h3 className="title-display text-sm text-dark dark:text-white">Notificações</h3>
        <button onClick={markAllRead} className="text-xs text-brand hover:text-brand-dark transition-colors">
          Marcar todas como lidas
        </button>
      </div>

      {/* List */}
      <div className="max-h-[440px] overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
        {notifications.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">Nenhuma notificação</div>
        )}
        {notifications.map(n => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className="w-full text-left px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex gap-3"
          >
            <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-brand'}`} />
            <div className="flex-shrink-0 mt-0.5">{ICONS[n.type] || <Settings size={16} className="text-gray-400" />}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${n.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-dark dark:text-white'}`}>
                {n.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatRelativeTime(n.created_at)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-200 dark:border-white/10">
        <button onClick={() => { navigate('/notifications'); onClose(); }} className="text-xs text-brand hover:text-brand-dark transition-colors w-full text-center">
          Ver todas as notificações
        </button>
      </div>
    </motion.div>
  );
}

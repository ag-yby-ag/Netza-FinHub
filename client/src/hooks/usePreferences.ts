import { useState, useEffect, useCallback } from 'react';
import type { Preferences } from '../types/auth';
import * as preferencesService from '../services/preferences';

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  sidebar_compact: 'false',
  email_notifications: 'true',
  ai_auto_insights: 'true',
  currency_format: 'BRL',
  date_format: 'dd/MM/yyyy',
  items_per_page: '25',
  language: 'pt-BR',
  notif_upload_done: 'true',
  notif_quote_expiring: 'true',
  notif_new_supplier: 'true',
  notif_ai_insight: 'true',
  notif_risk_push: 'false',
  notif_daily_summary: 'false',
  notif_daily_time: '08:00',
};

export function usePreferences(isAuthenticated: boolean) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const prefs = await preferencesService.getPreferences();
      setPreferences({ ...DEFAULT_PREFS, ...prefs });
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = useCallback(async (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    try {
      await preferencesService.updatePreference(key, value);
    } catch {
      // revert on failure
      setPreferences((prev) => ({ ...prev }));
    }
  }, []);

  return { preferences, loading, updatePreference, reloadPreferences: loadPreferences };
}

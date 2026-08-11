import { fr } from './locales/fr';
import { en } from './locales/en';
import { supabase } from '../lib/supabase';

export type BotLocale = 'fr' | 'en';

const locales: Record<BotLocale, any> = { fr, en };

export function tBot(lang: BotLocale, key: string, params?: Record<string, any>): string {
  const keys = key.split('.');
  let result = locales[lang] || locales.fr;

  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
    } else {
      // Fallback to fr
      let fallback = locales.fr;
      for (const fk of keys) {
        if (fallback && fallback[fk] !== undefined) {
          fallback = fallback[fk];
        } else {
          return key;
        }
      }
      result = fallback;
      break;
    }
  }

  if (typeof result !== 'string') return key;

  if (params) {
    Object.entries(params).forEach(([pKey, pVal]) => {
      result = (result as string).replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    });
  }

  return result;
}

export async function getGuildLanguage(guildId?: string | null): Promise<BotLocale> {
  if (!guildId) return 'fr';
  try {
    const { data } = await supabase
      .from('server_settings')
      .select('language')
      .eq('guild_id', guildId)
      .single();
    if (data?.language && (data.language === 'fr' || data.language === 'en')) {
      return data.language as BotLocale;
    }
  } catch (e) {}
  return 'fr';
}

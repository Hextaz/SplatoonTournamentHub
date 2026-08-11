import { Locale, TranslationParams } from "./types";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

export const dictionaries = { fr, en };

export const defaultLocale: Locale = "fr";

/**
 * Safely fetches a translation string given a dot-separated key path.
 * Example: getTranslationValue(fr, 'home.heroTitle') -> 'Le hub ultime pour vos tournois'
 */
export function getTranslationValue(
  dict: Record<string, any>,
  key: string,
): string | null {
  if (!key) return null;
  const parts = key.split(".");
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return typeof current === "string" ? current : null;
}

/**
 * Translates a key for a given locale with parameter interpolation.
 * Parameters can be formatted as {paramName} or {{paramName}}.
 */
export function t(
  locale: Locale,
  key: string,
  params?: TranslationParams,
): string {
  const dict = dictionaries[locale] || dictionaries[defaultLocale];
  let text = getTranslationValue(dict, key);

  // Fallback to default locale (fr) if missing in target locale
  if (text === null && locale !== defaultLocale) {
    text = getTranslationValue(dictionaries[defaultLocale], key);
  }

  // Fallback to key itself if missing everywhere
  if (text === null) {
    return key;
  }

  // Interpolate params if provided
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      const stringValue = String(paramValue);
      text = (text as string)
        .replace(new RegExp(`\\{${paramKey}\\}`, "g"), stringValue)
        .replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), stringValue);
    });
  }

  return text;
}

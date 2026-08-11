export type Locale = "fr" | "en";

export interface TranslationParams {
  [key: string]: string | number;
}

export type Translations = {
  [key: string]: string | Translations;
};

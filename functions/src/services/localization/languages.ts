export const LANGUAGE_OPTIONS = [
  {
    code: "en",
    nativeName: "English",
    flag: "🇬🇧",
  },
  {
    code: "de",
    nativeName: "Deutsch",
    flag: "🇩🇪",
  },
  {
    code: "fr",
    nativeName: "Français",
    flag: "🇫🇷",
  },
  {
    code: "es",
    nativeName: "Español",
    flag: "🇪🇸",
  },
  {
    code: "it",
    nativeName: "Italiano",
    flag: "🇮🇹",
  },
  {
    code: "ru",
    nativeName: "Русский",
    flag: "🇷🇺",
  },
  {
    code: "ja",
    nativeName: "日本語",
    flag: "🇯🇵",
  },
  {
    code: "pt",
    nativeName: "Português",
    flag: "🇵🇹",
  },
] as const;

export type SupportedLanguage = (typeof LANGUAGE_OPTIONS)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const isSupportedLanguage = (
  languageCode: string | null | undefined,
): languageCode is SupportedLanguage => {
  return LANGUAGE_OPTIONS.some((language) => language.code === languageCode);
};

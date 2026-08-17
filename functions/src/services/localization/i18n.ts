///////////////////////////// i18n.ts /////////////////////////////

// This file is used to configure i18next and export it globally

/////////////////////////////////////////////////////////////////

import i18next, { type TFunction } from "i18next";

import en from "./locales/en/common.json";
import de from "./locales/de/common.json";

import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguage,
} from "./languages";

/////////////////////////////////////////////////////////////////

// declare module "i18next" for the typescript compiler
const resources = {
  en: {
    common: en,
  },
  de: {
    common: de,
  },
};

// create a new instance of i18next
const createI18n = async (language: SupportedLanguage) => {
  const instance = i18next.createInstance();

  await instance.init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
};

export const getTranslation = async (
  language?: string | null,
): Promise<TFunction> => {
  const resolvedLanguage = isSupportedLanguage(language)
    ? language
    : DEFAULT_LANGUAGE;

  const instance = await createI18n(resolvedLanguage);

  return instance.t;
};

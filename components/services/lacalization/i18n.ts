import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import en from "./locales/en/common.json";
import de from "./locales/de/common.json";
// import fr from "./locales/fr/common.json";
// import es from "./locales/es/common.json";
// import it from "./locales/it/common.json";
// import ru from "./locales/ru/common.json";
// import ja from "./locales/ja/common.json";
// import pt from "./locales/pt/common.json";

import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGE_OPTIONS,
  type SupportedLanguage,
} from "./languages";

const LANGUAGE_STORAGE_KEY = "appLanguage";

const resources = {
  en: {
    common: en,
  },
  de: {
    common: de,
  },
  // fr: {
  //   common: fr,
  // },
  // es: {
  //   common: es,
  // },
  // it: {
  //   common: it,
  // },
  // ru: {
  //   common: ru,
  // },
  // ja: {
  //   common: ja,
  // },
  // pt: {
  //   common: pt,
  // },
};

const getDeviceLanguage = (): SupportedLanguage => {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;

  if (isSupportedLanguage(deviceLanguage)) {
    return deviceLanguage;
  }

  return DEFAULT_LANGUAGE;
};

export const initI18n = async (): Promise<void> => {
  if (i18n.isInitialized) {
    return;
  }

  let language: SupportedLanguage;

  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isSupportedLanguage(storedLanguage)) {
      language = storedLanguage;
    } else {
      language = getDeviceLanguage();
    }
  } catch (error) {
    console.error("[i18n] Failed to load stored language:", error);
    language = getDeviceLanguage();
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });
};

export const changeLanguage = async (
  language: SupportedLanguage,
): Promise<void> => {
  if (!isSupportedLanguage(language)) {
    throw new Error(`[i18n] Unsupported language: ${language}`);
  }

  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export const getSupportedLanguages = (): readonly SupportedLanguage[] =>
  LANGUAGE_OPTIONS.map((language) => language.code);

export default i18n;

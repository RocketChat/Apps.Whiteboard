import fallbackLangData from "./locales/en.json";

// Importing fallbackLangData from language JSON files
import langData_en from "./locales/en.json";
import langData_ar_sa from "./locales/ar-SA.json";
import langData_bg_bg from "./locales/bg-BG.json";
import langData_ca_es from "./locales/ca-ES.json";
import langData_cs_cz from "./locales/cs-CZ.json";
import langData_de_de from "./locales/de-DE.json";
import langData_el_gr from "./locales/el-GR.json";
import langData_es_es from "./locales/es-ES.json";
import langData_eu_es from "./locales/eu-ES.json";
import langData_fa_ir from "./locales/fa-IR.json";
import langData_fi_fi from "./locales/fi-FI.json";
import langData_fr_fr from "./locales/fr-FR.json";
import langData_gl_es from "./locales/gl-ES.json";
import langData_he_il from "./locales/he-IL.json";
import langData_hi_in from "./locales/hi-IN.json";
import langData_hu_hu from "./locales/hu-HU.json";
import langData_id_id from "./locales/id-ID.json";
import langData_it_it from "./locales/it-IT.json";
import langData_ja_jp from "./locales/ja-JP.json";
import langData_kab_kab from "./locales/kab-KAB.json";
import langData_kk_kz from "./locales/kk-KZ.json";
import langData_ko_kr from "./locales/ko-KR.json";
import langData_ku_tr from "./locales/ku-TR.json";
import langData_lt_lt from "./locales/lt-LT.json";
import langData_lv_lv from "./locales/lv-LV.json";
import langData_my_mm from "./locales/my-MM.json";
import langData_nb_no from "./locales/nb-NO.json";
import langData_nl_nl from "./locales/nl-NL.json";
import langData_nn_no from "./locales/nn-NO.json";
import langData_oc_fr from "./locales/oc-FR.json";
import langData_pa_in from "./locales/pa-IN.json";
import langData_pl_pl from "./locales/pl-PL.json";
import langData_pt_br from "./locales/pt-BR.json";
import langData_pt_pt from "./locales/pt-PT.json";
import langData_ro_ro from "./locales/ro-RO.json";
import langData_ru_ru from "./locales/ru-RU.json";
import langData_sk_sk from "./locales/sk-SK.json";
import langData_sv_se from "./locales/sv-SE.json";
import langData_sl_si from "./locales/sl-SI.json";
import langData_tr_tr from "./locales/tr-TR.json";
import langData_uk_ua from "./locales/uk-UA.json";
import langData_zh_cn from "./locales/zh-CN.json";
import langData_zh_tw from "./locales/zh-TW.json";
import langData_vi_vn from "./locales/vi-VN.json";
import langData_mr_in from "./locales/mr-IN.json";
import langData_af from "./locales/af.json";
import langData_az from "./locales/az.json";
import langData_bn_in from "./locales/bn-IN.json";
import langData_be_by from "./locales/be-BY.json";
import langData_bas_cm from "./locales/bas-CM.json";
import langData_ms_my from "./locales/ms-MY.json";
import langData_eo from "./locales/eo.json";
import langData_kg from "./locales/kg.json";
import langData_bs from "./locales/bs.json";
import langData_de_at from "./locales/de-AT.json";
import langData_ka_ge from "./locales/ka-GE.json";
import langData_mn from "./locales/mn.json";
import langData_no from "./locales/no.json";

import percentages from "./locales/percentages.json";
import { ENV } from "./constants";
import { jotaiScope, jotaiStore } from "./jotai";
import { atom, useAtomValue } from "jotai";

// It represents the minimum completion percentage required for a language to be considered complete.
const COMPLETION_THRESHOLD = 85;
// const COMPLETION_THRESHOLD = 50;

export interface Language {
  code: string;
  label: string;
  rtl?: boolean; //rtl : a boolean indicating whether the language is written from right to left
}

export const defaultLang = { code: "en", label: "English" };

const allLanguages: Language[] = [
  { code: "ar-SA", label: "العربية", rtl: true },
  { code: "bg-BG", label: "Български" },
  { code: "ca-ES", label: "Català" },
  { code: "cs-CZ", label: "Česky" },
  { code: "de-DE", label: "Deutsch" },
  { code: "el-GR", label: "Ελληνικά" },
  { code: "es-ES", label: "Español" },
  { code: "eu-ES", label: "Euskara" },
  { code: "fa-IR", label: "فارسی", rtl: true },
  { code: "fi-FI", label: "Suomi" },
  { code: "fr-FR", label: "Français" },
  { code: "gl-ES", label: "Galego" },
  { code: "he-IL", label: "עברית", rtl: true },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "hu-HU", label: "Magyar" },
  { code: "id-ID", label: "Bahasa Indonesia" },
  { code: "it-IT", label: "Italiano" },
  { code: "ja-JP", label: "日本語" },
  { code: "kab-KAB", label: "Taqbaylit" },
  { code: "kk-KZ", label: "Қазақ тілі" },
  { code: "ko-KR", label: "한국어" },
  { code: "ku-TR", label: "Kurdî" },
  { code: "lt-LT", label: "Lietuvių" },
  { code: "lv-LV", label: "Latviešu" },
  { code: "my-MM", label: "Burmese" },
  { code: "nb-NO", label: "Norsk bokmål" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "nn-NO", label: "Norsk nynorsk" },
  { code: "oc-FR", label: "Occitan" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
  { code: "pl-PL", label: "Polski" },
  { code: "pt-BR", label: "Português Brasileiro" },
  { code: "pt-PT", label: "Português" },
  { code: "ro-RO", label: "Română" },
  { code: "ru-RU", label: "Русский" },
  { code: "sk-SK", label: "Slovenčina" },
  { code: "sv-SE", label: "Svenska" },
  { code: "sl-SI", label: "Slovenščina" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "uk-UA", label: "Українська" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "mr-IN", label: "मराठी" },
  { code: "af", label: "Afrikaans", rtl: true },
  { code: "az", label: "Azərbaycan dili" },
  { code: "bn-IN", label: "বাংলা (ভারত)" },
  { code: "be-BY", label: "Беларуская" },
  { code: "bas-CM", label: "Basa (Cameroon)" },
  { code: "de-AT", label: "Deutsch (Österreich)" },
  { code: "ms-MY", label: "Bahasa Melayu (Malaysia)" },
  { code: "eo", label: "Esperanto" },
  { code: "ka-GE", label: "ქართული (Georgia)" },
  { code: "kg", label: "Kongo" },
  { code: "bs", label: "Bosanski" },
  { code: "mn", label: "Монгол" },
  { code: "no", label: "Norsk" },

].concat([defaultLang]);

// Mapping language codes to their imported json data
const langImportsMap: Record<string, any> = {
  en: langData_en,
  "ar-SA": langData_ar_sa,
  "bg-BG": langData_bg_bg,
  "ca-ES": langData_ca_es,
  "cs-CZ": langData_cs_cz,
  "de-DE": langData_de_de,
  "el-GR": langData_el_gr,
  "es-ES": langData_es_es,
  "eu-ES": langData_eu_es,
  "fa-IR": langData_fa_ir,
  "fi-FI": langData_fi_fi,
  "fr-FR": langData_fr_fr,
  "gl-ES": langData_gl_es,
  "he-IL": langData_he_il,
  "hi-IN": langData_hi_in,
  "hu-HU": langData_hu_hu,
  "id-ID": langData_id_id,
  "it-IT": langData_it_it,
  "ja-JP": langData_ja_jp,
  "kab-KAB": langData_kab_kab,
  "kk-KZ": langData_kk_kz,
  "ko-KR": langData_ko_kr,
  "ku-TR": langData_ku_tr,
  "lt-LT": langData_lt_lt,
  "lv-LV": langData_lv_lv,
  "my-MM": langData_my_mm,
  "nb-NO": langData_nb_no,
  "nl-NL": langData_nl_nl,
  "nn-NO": langData_nn_no,
  "oc-FR": langData_oc_fr,
  "pa-IN": langData_pa_in,
  "pl-PL": langData_pl_pl,
  "pt-BR": langData_pt_br,
  "pt-PT": langData_pt_pt,
  "ro-RO": langData_ro_ro,
  "ru-RU": langData_ru_ru,
  "sk-SK": langData_sk_sk,
  "sv-SE": langData_sv_se,
  "sl-SI": langData_sl_si,
  "tr-TR": langData_tr_tr,
  "uk-UA": langData_uk_ua,
  "zh-CN": langData_zh_cn,
  "zh-TW": langData_zh_tw,
  "vi-VN": langData_vi_vn,
  "mr-IN": langData_mr_in,
  "af": langData_af,
  "az": langData_az,
  "bn-IN": langData_bn_in,
  "bas-CM": langData_bas_cm,
  "be-BY": langData_be_by,
  "bs": langData_bs,
  "de-AT": langData_de_at,
  "eo": langData_eo,
  "ka-GE": langData_ka_ge,
  "kg": langData_kg,
  "mn": langData_mn,
  "ms-MY": langData_ms_my,
  "no": langData_no,
};

// Sorting the languages alphabetically based on the label property and filtering out the languages based on the completion threshold
export const languages: Language[] = allLanguages
  .sort((left, right) => (left.label > right.label ? 1 : -1))
  .filter((lang) => {
    // console.log("lang ", lang);
    return (percentages as Record<string, number>)[lang.code] >= COMPLETION_THRESHOLD;
  });

// If the environment is set to development (ENV.DEVELOPMENT), two additional languages are added to the beginning of the languages array
const TEST_LANG_CODE = "__test__";
if (process.env.NODE_ENV === ENV.DEVELOPMENT) {
  languages.unshift(
    { code: TEST_LANG_CODE, label: "test language" },
    {
      code: `${TEST_LANG_CODE}.rtl`,
      label: "\u{202a}test language (rtl)\u{202c}",
      rtl: true,
    }
  );
}

let currentLang: Language = defaultLang;
let currentLangData = {};

console.log("Checking languages ", languages)

export const setLanguage = async (lang: Language) => {
  currentLang = lang;
  document.documentElement.dir = currentLang.rtl ? "rtl" : "ltr"; // This code is responsible for changing direction of text from right to left for rtl languages
  document.documentElement.lang = currentLang.code;

  if (lang.code.startsWith(TEST_LANG_CODE)) {
    currentLangData = {};
  } else {
    try {
      currentLangData = langImportsMap[currentLang.code];
      // currentLangData = await import(
      //   /* webpackChunkName: "locales/[request]" */ `./locales/${currentLang.code}.json`
      // );
    } catch (error: any) {
      console.error(`Failed to load language ${lang.code}:`, error.message);
      currentLangData = fallbackLangData;
    }
  }

  jotaiStore.set(editorLangCodeAtom, lang.code);
};

export const getLanguage = () => currentLang;

const findPartsForData = (data: any, parts: string[]) => {
  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];
    if (data[part] === undefined) {
      return undefined;
    }
    data = data[part];
  }
  if (typeof data !== "string") {
    return undefined;
  }
  return data;
};

export const t = (
  path: string,
  replacement?: { [key: string]: string | number }
) => {
  if (currentLang.code.startsWith(TEST_LANG_CODE)) {
    const name = replacement
      ? `${path}(${JSON.stringify(replacement).slice(1, -1)})`
      : path;
    return `\u{202a}[[${name}]]\u{202c}`;
  }

  const parts = path.split(".");
  let translation =
    findPartsForData(currentLangData, parts) ||
    findPartsForData(fallbackLangData, parts);
  if (translation === undefined) {
    throw new Error(`Can't find translation for ${path}`);
  }

  if (replacement) {
    for (const key in replacement) {
      translation = translation.replace(`{{${key}}}`, String(replacement[key]));
    }
  }
  return translation;
};

/** @private atom used solely to rerender components using `useI18n` hook */
const editorLangCodeAtom = atom(defaultLang.code);

// Should be used in components that fall under these cases:
// - component is rendered as an <Excalidraw> child
// - component is rendered internally by <Excalidraw>, but the component
//   is memoized w/o being updated on `langCode`, `AppState`, or `UIAppState`
export const useI18n = () => {
  const langCode = useAtomValue(editorLangCodeAtom, jotaiScope);
  return { t, langCode };
};

"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations as coreTranslations, getLang as coreGetLang, setLang as coreSetLang } from "@/lib/i18n/i18n";

export type Lang = "en" | "id";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  en: {
    "buttons.continue": "Continue Registration",
    "buttons.customLicense": "Custom License",
    "buttons.uploadFile": "Upload File",
    "buttons.why": "Why?",

    "smart.applied.title": "AI recommendation applied 🎉",
    "smart.applied.body": "{message}\n\nLicense: {license}\nAI Learning: {aiLearning}\n\nDetails\n- Minting fee: $ {mintingFee}\n- Revenue share: {revShare}%\n- Commercial use: {commercialUse}\n- Derivatives: {derivatives}\n\nContinue registration or adjust settings",

    "details.title": "Analysis details",
    "details.ai": "AI",
    "details.quality": "Quality",
    "details.ip": "IP",
    "details.license": "License",
    "details.risk": "Risk",
    "details.suggestion": "Suggestion",

    "toasts.aiApplied": "AI recommendation applied ✅",
    "toasts.noAI": "No AI recommendation available ❌",
    "generic.noMoreDetails": "No additional details available",

    "yes": "allowed",
    "no": "restricted",
  },
  id: {
    "buttons.continue": "Lanjutkan Registrasi",
    "buttons.customLicense": "Custom License",
    "buttons.uploadFile": "Unggah Berkas",
    "buttons.why": "Kenapa?",

    "smart.applied.title": "Rekomendasi AI diterapkan 🎉",
    "smart.applied.body": "{message}\n\nLisensi: {license}\nAI Learning: {aiLearning}\n\nRincian\n- Minting fee: $ {mintingFee}\n- Revenue share: {revShare}%\n- Commercial use: {commercialUse}\n- Derivatives: {derivatives}\n\nLanjutkan registrasi atau ubah pengaturan",

    "details.title": "Detail analisis",
    "details.ai": "AI",
    "details.quality": "Kualitas",
    "details.ip": "IP",
    "details.license": "Lisensi",
    "details.risk": "Risiko",
    "details.suggestion": "Saran",

    "toasts.aiApplied": "Rekomendasi AI diterapkan ✅",
    "toasts.noAI": "Rekomendasi AI tidak tersedia ❌",
    "generic.noMoreDetails": "Tidak ada detail tambahan",

    "yes": "diizinkan",
    "no": "dibatasi",
  },
};

function interpolate(template: string, vars: Record<string, string | number | boolean>): string {
  return template.replace(/\{(.*?)\}/g, (_, k) => String(vars[k] ?? ""));
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number | boolean>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => { coreSetLang(lang); }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number | boolean>) => {
    const dict = coreTranslations[lang] as Record<string, string>;
    const str = dict[key] ?? (coreTranslations.en as any)[key] ?? key;
    return vars ? interpolate(str, vars) : str;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

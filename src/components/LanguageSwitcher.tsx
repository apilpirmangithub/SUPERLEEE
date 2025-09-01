"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 rounded text-xs border ${lang === 'en' ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}
        title="English"
      >EN</button>
      <button
        onClick={() => setLang("id")}
        className={`px-2 py-1 rounded text-xs border ${lang === 'id' ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}`}
        title="Bahasa Indonesia"
      >ID</button>
    </div>
  );
}

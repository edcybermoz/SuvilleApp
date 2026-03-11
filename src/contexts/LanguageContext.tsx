import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppLanguage } from "@/i18n/translations";
import { translations } from "@/i18n/translations";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { updateUsuario } from "@/lib/store";

type TranslateParams = Record<string, string | number>;

type LanguageContextType = {
  language: AppLanguage;
  t: (path: string, fallback?: string, params?: TranslateParams) => string;
  setLanguage: (lang: AppLanguage) => void;
  changeUserLanguage: (lang: AppLanguage) => Promise<void>;
  changeSystemLanguage: (lang: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const getNestedValue = (obj: any, path: string) =>
  path.split(".").reduce((acc, part) => acc?.[part], obj);

const isValidLanguage = (lang: unknown): lang is AppLanguage => {
  return typeof lang === "string" && lang in translations;
};

const interpolate = (text: string, params?: TranslateParams) => {
  if (!params) return text;

  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.split(`{{${key}}}`).join(String(value));
  }, text);
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, userData } = useAuth();
  const { sistemaConfig } = useSystemConfig();

  const [language, setLanguageState] = useState<AppLanguage>("pt");

  useEffect(() => {
    const fromSystem = sistemaConfig?.idioma;
    const fromUser = userData?.idioma;
    const fromStorage = localStorage.getItem("app_language");

    if (isValidLanguage(fromSystem)) {
      setLanguageState(fromSystem);
      localStorage.setItem("app_language", fromSystem);
      return;
    }

    if (isValidLanguage(fromUser)) {
      setLanguageState(fromUser);
      localStorage.setItem("app_language", fromUser);
      return;
    }

    if (isValidLanguage(fromStorage)) {
      setLanguageState(fromStorage);
      return;
    }

    setLanguageState("pt");
    localStorage.setItem("app_language", "pt");
  }, [sistemaConfig?.idioma, userData?.idioma]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const changeUserLanguage = async (lang: AppLanguage) => {
    setLanguage(lang);

    if (firebaseUser?.uid) {
      try {
        await updateUsuario(firebaseUser.uid, { idioma: lang } as any);
      } catch (error) {
        console.error("Erro ao salvar idioma do utilizador:", error);
        throw error;
      }
    }
  };

  const changeSystemLanguage = (lang: AppLanguage) => {
    setLanguage(lang);
  };

  const t = useMemo(() => {
    return (path: string, fallback?: string, params?: TranslateParams) => {
      const value = getNestedValue(translations[language], path);

      if (typeof value === "string") {
        return interpolate(value, params);
      }

      return fallback ?? path;
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        t,
        setLanguage,
        changeUserLanguage,
        changeSystemLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage deve ser usado dentro de LanguageProvider");
  }
  return ctx;
};
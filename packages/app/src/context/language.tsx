import * as i18n from "@solid-primitives/i18n"
import { createEffect, createMemo, createResource } from "solid-js"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "@arabcode/ui/context"
import { Persist, persisted } from "@/utils/persist"
import { dict as en } from "@/i18n/en"
import { dict as uiEn } from "@arabcode/ui/i18n/en"

export type Locale =
  | "en"
  | "zh"
  | "zht"
  | "ko"
  | "de"
  | "es"
  | "fr"
  | "da"
  | "ja"
  | "pl"
  | "ru"
  | "uk"
  | "ar"
  | "no"
  | "br"
  | "th"
  | "bs"
  | "tr"

type RawDictionary = typeof en & typeof uiEn
type Dictionary = i18n.Flatten<RawDictionary>
type Source = { dict: Record<string, string> }

function cookie(locale: Locale) {
  return `oc_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export const DEFAULT_LOCALE: Locale = "ar"

export function directionFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}

const LOCALES: readonly Locale[] = [
  "en",
  "zh",
  "zht",
  "ko",
  "de",
  "es",
  "fr",
  "da",
  "ja",
  "pl",
  "ru",
  "uk",
  "bs",
  "ar",
  "no",
  "br",
  "th",
  "tr",
]

const INTL: Record<Locale, string> = {
  en: "en",
  zh: "zh-Hans",
  zht: "zh-Hant",
  ko: "ko",
  de: "de",
  es: "es",
  fr: "fr",
  da: "da",
  ja: "ja",
  pl: "pl",
  ru: "ru",
  uk: "uk",
  ar: "ar",
  no: "nb-NO",
  br: "pt-BR",
  th: "th",
  bs: "bs",
  tr: "tr",
}

const LABEL_KEY: Record<Locale, keyof Dictionary> = {
  en: "language.en",
  zh: "language.zh",
  zht: "language.zht",
  ko: "language.ko",
  de: "language.de",
  es: "language.es",
  fr: "language.fr",
  da: "language.da",
  ja: "language.ja",
  pl: "language.pl",
  ru: "language.ru",
  uk: "language.uk",
  ar: "language.ar",
  no: "language.no",
  br: "language.br",
  th: "language.th",
  bs: "language.bs",
  tr: "language.tr",
}

const base = i18n.flatten({ ...en, ...uiEn })
const dicts = new Map<Locale, Dictionary>([["en", base]])

const merge = (app: Promise<Source>, ui: Promise<Source>) =>
  Promise.all([app, ui]).then(([a, b]) => ({ ...base, ...i18n.flatten({ ...a.dict, ...b.dict }) }) as Dictionary)

const loaders: Record<Exclude<Locale, "en">, () => Promise<Dictionary>> = {
  zh: () => merge(import("@/i18n/zh"), import("@arabcode/ui/i18n/zh")),
  zht: () => merge(import("@/i18n/zht"), import("@arabcode/ui/i18n/zht")),
  ko: () => merge(import("@/i18n/ko"), import("@arabcode/ui/i18n/ko")),
  de: () => merge(import("@/i18n/de"), import("@arabcode/ui/i18n/de")),
  es: () => merge(import("@/i18n/es"), import("@arabcode/ui/i18n/es")),
  fr: () => merge(import("@/i18n/fr"), import("@arabcode/ui/i18n/fr")),
  da: () => merge(import("@/i18n/da"), import("@arabcode/ui/i18n/da")),
  ja: () => merge(import("@/i18n/ja"), import("@arabcode/ui/i18n/ja")),
  pl: () => merge(import("@/i18n/pl"), import("@arabcode/ui/i18n/pl")),
  ru: () => merge(import("@/i18n/ru"), import("@arabcode/ui/i18n/ru")),
  uk: () => merge(import("@/i18n/uk"), import("@arabcode/ui/i18n/uk")),
  ar: () => merge(import("@/i18n/ar"), import("@arabcode/ui/i18n/ar")),
  no: () => merge(import("@/i18n/no"), import("@arabcode/ui/i18n/no")),
  br: () => merge(import("@/i18n/br"), import("@arabcode/ui/i18n/br")),
  th: () => merge(import("@/i18n/th"), import("@arabcode/ui/i18n/th")),
  bs: () => merge(import("@/i18n/bs"), import("@arabcode/ui/i18n/bs")),
  tr: () => merge(import("@/i18n/tr"), import("@arabcode/ui/i18n/tr")),
}

function loadDict(locale: Locale) {
  const hit = dicts.get(locale)
  if (hit) return Promise.resolve(hit)
  if (locale === "en") return Promise.resolve(base)
  const load = loaders[locale]
  return load().then((next: Dictionary) => {
    dicts.set(locale, next)
    return next
  })
}

export function loadLocaleDict(locale: Locale) {
  return loadDict(locale).then(() => undefined)
}

export function normalizeLocale(value: string): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE
}

function readStoredLocale() {
  if (typeof localStorage !== "object") return
  try {
    const raw = localStorage.getItem("opencode.global.dat:language")
    if (!raw) return
    const next = JSON.parse(raw) as { locale?: string }
    if (typeof next?.locale !== "string") return
    return normalizeLocale(next.locale)
  } catch {
    return
  }
}

const warm = readStoredLocale() ?? DEFAULT_LOCALE
if (warm !== "en") void loadDict(warm)

export const { use: useLanguage, provider: LanguageProvider } = createSimpleContext({
  name: "Language",
  gate: false,
  init: (props: { locale?: Locale }) => {
    const initial = props.locale ?? readStoredLocale() ?? DEFAULT_LOCALE
    const [store, setStore, _, ready] = persisted(
      Persist.global("language", ["language.v1"]),
      createStore({
        locale: initial,
      }),
    )

    const locale = createMemo<Locale>(() => normalizeLocale(store.locale))
    const intl = createMemo(() => INTL[locale()])

    const [dict] = createResource(locale, loadDict, {
      initialValue: dicts.get(initial) ?? base,
    })

    const t = i18n.translator(() => dict() ?? base, i18n.resolveTemplate) as (
      key: keyof Dictionary,
      params?: Record<string, string | number | boolean>,
    ) => string

    const label = (value: Locale) => t(LABEL_KEY[value])

    createEffect(() => {
      if (typeof document !== "object") return
      document.documentElement.lang = locale()
      document.documentElement.dir = directionFor(locale())
      document.cookie = cookie(locale())
    })

    return {
      ready,
      locale,
      intl,
      locales: LOCALES,
      label,
      t,
      setLocale(next: Locale) {
        setStore("locale", normalizeLocale(next))
      },
    }
  },
})

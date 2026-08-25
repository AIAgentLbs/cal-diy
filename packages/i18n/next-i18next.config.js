const path = require("node:path");
const i18n = require("../../i18n.json");

const configuredLocales = i18n.locale.targets.concat([i18n.locale.source]);
const forcedLocale = process.env.NEXT_PUBLIC_FORCE_LOCALE;
if (forcedLocale && !configuredLocales.includes(forcedLocale)) {
  throw new Error(`NEXT_PUBLIC_FORCE_LOCALE must be one of: ${configuredLocales.join(", ")}`);
}

/** @type {import("next-i18next").UserConfig} */
const config = {
  i18n: {
    defaultLocale: forcedLocale || i18n.locale.source,
    locales: forcedLocale ? [forcedLocale] : configuredLocales,
  },
  fallbackLng: {
    default: [forcedLocale || "en"],
    zh: ["zh-CN"],
  },
  reloadOnPrerender: process.env.NODE_ENV !== "production",
  localePath: path.resolve(__dirname, "./locales"),
};

module.exports = config;

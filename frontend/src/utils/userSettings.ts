export type UserSettings = Record<string, string>;

export const SETTINGS_STORAGE_KEY = "user_settings";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  nickname: "",
  default_asset_class: "futures",
  default_session: "",
  currency: "USD",
  date_format: "MM/DD/YYYY",
  default_point_value: "20",
  default_contract_size: "10",
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveStoredSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getSetting(key: keyof typeof DEFAULT_SETTINGS): string {
  const settings = getStoredSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
}

export function formatWithUserDate(dateLike: string | number | Date): string {
  const date = new Date(dateLike);
  const format = getSetting("date_format");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();

  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}

export function formatCurrency(value: number): string {
  const currency = getSetting("currency");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

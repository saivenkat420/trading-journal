import { useState, useEffect } from "react";
import { settingsApi } from "../utils/api";
import {
  Card,
  LoadingSpinner,
  Button,
  Input,
  Select,
  ErrorMessage,
  SuccessMessage,
} from "../components";

interface SettingItem {
  key: string;
  value: string;
  label: string;
  type: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  description?: string;
}

const SETTING_DEFINITIONS: SettingItem[] = [
  {
    key: "theme",
    value: "dark",
    label: "Theme",
    type: "select",
    options: [
      { value: "dark", label: "Dark Mode" },
      { value: "light", label: "Light Mode" },
      { value: "system", label: "System Default" },
    ],
    description: "Choose your preferred color theme",
  },
  {
    key: "nickname",
    value: "",
    label: "Display Nickname",
    type: "text",
    description: "A nickname to display instead of your email",
  },
  {
    key: "default_asset_class",
    value: "futures",
    label: "Default Asset Class",
    type: "select",
    options: [
      { value: "futures", label: "Futures" },
      { value: "forex", label: "Forex" },
      { value: "stocks", label: "Stocks" },
      { value: "crypto", label: "Crypto" },
    ],
    description: "Default asset class when adding new trades",
  },
  {
    key: "default_session",
    value: "",
    label: "Default Trading Session",
    type: "select",
    options: [
      { value: "", label: "None" },
      { value: "asia", label: "Asia" },
      { value: "london", label: "London" },
      { value: "newyork", label: "New York" },
      { value: "newyork_pm", label: "New York (PM)" },
    ],
    description: "Default session when adding new trades",
  },
  {
    key: "currency",
    value: "USD",
    label: "Display Currency",
    type: "select",
    options: [
      { value: "USD", label: "USD ($)" },
      { value: "EUR", label: "EUR (€)" },
      { value: "GBP", label: "GBP (£)" },
      { value: "INR", label: "INR (₹)" },
      { value: "JPY", label: "JPY (¥)" },
    ],
    description: "Currency for displaying monetary values",
  },
  {
    key: "date_format",
    value: "MM/DD/YYYY",
    label: "Date Format",
    type: "select",
    options: [
      { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
      { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
      { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
    ],
    description: "Preferred date display format",
  },
  {
    key: "default_point_value",
    value: "20",
    label: "Default Point Value (Futures)",
    type: "number",
    description: "Default point value for futures trades",
  },
  {
    key: "default_contract_size",
    value: "10",
    label: "Default Contract Size (Forex)",
    type: "number",
    description: "Default contract size for forex trades",
  },
];

function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsApi.getAll();
      const settingsMap: Record<string, string> = {};
      
      // Initialize with defaults
      SETTING_DEFINITIONS.forEach((def) => {
        settingsMap[def.key] = def.value;
      });
      
      // Override with saved values
      if (res.data.data && Array.isArray(res.data.data)) {
        res.data.data.forEach((setting: { key: string; value: string }) => {
          settingsMap[setting.key] = setting.value;
        });
      }
      
      setSettings(settingsMap);
    } catch (err: any) {
      console.error("Error loading settings:", err);
      // Initialize with defaults on error
      const settingsMap: Record<string, string> = {};
      SETTING_DEFINITIONS.forEach((def) => {
        settingsMap[def.key] = def.value;
      });
      setSettings(settingsMap);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (key: string) => {
    setError(null);
    setSuccess(null);
    setSaving(key);

    try {
      await settingsApi.update(key, settings[key]);
      setSuccess(`Setting "${key}" saved successfully`);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to save setting");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccess(null);
    setSaving("all");

    try {
      const promises = Object.entries(settings).map(([key, value]) =>
        settingsApi.update(key, value)
      );
      await Promise.all(promises);
      setSuccess("All settings saved successfully");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to save settings");
    } finally {
      setSaving(null);
    }
  };

  const handleReset = () => {
    const defaults: Record<string, string> = {};
    SETTING_DEFINITIONS.forEach((def) => {
      defaults[def.key] = def.value;
    });
    setSettings(defaults);
    setSuccess("Settings reset to defaults (not saved yet)");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Customize your trading journal preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveAll} isLoading={saving === "all"}>
            Save All
          </Button>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Appearance Settings */}
      <Card title="Appearance">
        <div className="space-y-6">
          {SETTING_DEFINITIONS.filter((s) =>
            ["theme", "nickname", "currency", "date_format"].includes(s.key)
          ).map((setting) => (
            <div
              key={setting.key}
              className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-dark-border-primary last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-dark-text-primary mb-1">
                  {setting.label}
                </label>
                {setting.description && (
                  <p className="text-xs text-dark-text-tertiary">
                    {setting.description}
                  </p>
                )}
              </div>
              <div className="w-full sm:w-64 flex gap-2">
                {setting.type === "select" && setting.options ? (
                  <Select
                    label=""
                    value={settings[setting.key] || ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    options={setting.options}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    label=""
                    type={setting.type}
                    value={settings[setting.key] || ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave(setting.key)}
                  isLoading={saving === setting.key}
                  className="mt-0"
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trading Defaults */}
      <Card title="Trading Defaults">
        <div className="space-y-6">
          {SETTING_DEFINITIONS.filter((s) =>
            [
              "default_asset_class",
              "default_session",
              "default_point_value",
              "default_contract_size",
            ].includes(s.key)
          ).map((setting) => (
            <div
              key={setting.key}
              className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-dark-border-primary last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-dark-text-primary mb-1">
                  {setting.label}
                </label>
                {setting.description && (
                  <p className="text-xs text-dark-text-tertiary">
                    {setting.description}
                  </p>
                )}
              </div>
              <div className="w-full sm:w-64 flex gap-2">
                {setting.type === "select" && setting.options ? (
                  <Select
                    label=""
                    value={settings[setting.key] || ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    options={setting.options}
                    className="flex-1"
                  />
                ) : (
                  <Input
                    label=""
                    type={setting.type}
                    value={settings[setting.key] || ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave(setting.key)}
                  isLoading={saving === setting.key}
                  className="mt-0"
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info Card */}
      <Card>
        <div className="flex items-start gap-3 text-dark-text-secondary">
          <svg
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-dark-text-primary mb-1">
              About Settings
            </p>
            <p>
              Settings are stored per user and will persist across sessions.
              Some settings like theme may require a page refresh to take full
              effect.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Settings;

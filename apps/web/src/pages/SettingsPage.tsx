import { useState, useEffect } from "react";
import {
  IconUser,
  IconPalette,
  IconKey,
  IconDots,
  IconCheck,
  IconCopy,
  IconTrash,
  IconRefresh,
  IconSun,
  IconMoonStars,
  IconDeviceDesktop,
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { themeManager } from "@/stores/theme";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState("JohnDoe");
  const [profilePicture, setProfilePicture] = useState(
    "https://i.pravatar.cc/150?u=a04258a2462d826712d",
  );
  const [selectedTheme, setSelectedTheme] = useState("dark");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const currentTheme = themeManager.getTheme();
    setSelectedTheme(currentTheme);
  }, []);

  const THEMES = [
    { value: "light", label: "Light", icon: IconSun },
    { value: "dark", label: "Dark", icon: IconMoonStars },
    { value: "system", label: "System", icon: IconDeviceDesktop },
    { value: "custom", label: "Custom", icon: IconAdjustmentsHorizontal },
  ];

  const TABS = [
    { id: "account", label: "Account", icon: IconUser },
    { id: "theme", label: "Theme", icon: IconPalette },
    { id: "api", label: "API", icon: IconKey },
    { id: "other", label: "Other", icon: IconDots },
  ];

  const generateApiKey = () => {
    const key = "wndb_123";
    setApiKey(key);
  };

  const deleteApiKey = () => {
    setApiKey("");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveAccount = () => {
    console.log("Saving account settings:", {
      displayName,
      profilePicture,
    });
    alert("Account settings saved!");
  };

  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
    themeManager.setTheme(theme);
  };

  return (
    <div className="flex gap-4">
      <div className="w-48 flex-shrink-0">
        <div className="space-y-1">
          {TABS.map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 rounded-md ${
                  activeTab === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <tab.icon size={20} />
                <span className="font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="w-full bg-card border border-border rounded-md px-4 py-2">
        {activeTab === "account" && (
          <div className="mb-2">
            <div>
              <span className="text-2xl font-semibold mb-4">
                Account Settings
              </span>
              <p className="text-muted-foreground mb-4">
                Manage your account information
              </p>
            </div>
            <div className="flex gap-6 ml-2">
              <img
                src={profilePicture}
                className="my-auto w-30 h-30 rounded-full object-cover border border-border"
              />
              <div className="flex-1">
                <div>
                  <span className="block text-sm font-semibold mb-1">
                    Display Name
                  </span>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div className="mt-2">
                  <span className="block text-sm font-semibold mb-1">
                    Profile Picture
                  </span>
                  <Input
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder="Image URL"
                  />
                </div>
              </div>
            </div>
            <Button size="lg" className="mt-3" onClick={saveAccount}>
              Save Changes
            </Button>
          </div>
        )}

        {activeTab === "theme" && (
          <div>
            <div>
              <span className="text-2xl font-semibold">Theme Settings</span>
              <p className="text-muted-foreground mb-4">
                Customize the appearance of your interface
              </p>
            </div>

            <div className="mb-2">
              <div>
                <label className="block font-semibold mb-1">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeChange(theme.value)}
                      className={`p-4 rounded-md border ${
                        selectedTheme === theme.value
                          ? "border-ring bg-accent"
                          : "border-border bg-accent/50 hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium inline-flex">
                          <theme.icon className="mr-2" />
                          {theme.label}
                        </span>
                        {selectedTheme === theme.value && (
                          <span className="text-primary font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTheme === "custom" && (
                <div className="mt-4 p-4 bg-accent rounded-md border border-border">
                  <p className="text-sm text-muted-foreground">
                    Custom theme editor coming soon! You'll be able to customize
                    colors, fonts, and more.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <div className="mb-2">
            <div>
              <span className="text-2xl font-semibold">API Settings</span>
              <p className="text-muted-foreground mb-5">Manage your API key</p>
            </div>

            <div>
              {!apiKey ? (
                <div className="p-6 bg-accent rounded-md border border-border text-center">
                  <IconKey
                    size={48}
                    className="mx-auto mb-4 text-muted-foreground"
                  />
                  <span className="font-semibold mb-2">
                    No API Key Generated
                  </span>
                  <p className="text-sm text-muted-foreground mb-6">
                    Generate an API key to access the WebNDB API
                  </p>
                  <Button size="lg" onClick={generateApiKey}>
                    Generate API Key
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="p-4 bg-accent rounded-md border border-border">
                    <span className="block text-sm font-semibold mb-1">
                      Your API Key
                      <span className="text-xs text-muted-foreground ml-2">
                        Keep your API key secure. Do not share it publicly.
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <Input value={apiKey} readOnly className="flex-1" />
                      <Button onClick={copyToClipboard}>
                        {copied ? (
                          <IconCheck size={20} className="text-green-500" />
                        ) : (
                          <IconCopy size={20} />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button onClick={generateApiKey}>
                      <IconRefresh size={18} />
                      Regenerate
                    </Button>
                    <Button onClick={deleteApiKey} variant="destructive">
                      <IconTrash size={18} />
                      Delete
                    </Button>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-md px-4 py-2 w-full">
                      <div className="flex items-start gap-2">
                        <IconAlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 ml-1">
                          Regenerating or deleting your API key will invalidate
                          the current key. Update all applications using the old
                          key.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "other" && (
          <div>
            <span className="text-2xl font-semibold">Other Settings</span>
            <p className="text-muted-foreground">
              Additional settings and preferences
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

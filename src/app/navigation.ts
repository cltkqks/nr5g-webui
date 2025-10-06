export const TABS = [
  "overview",
  "spectrum",
  "measurements",
  "setup",
  "applications",
] as const;

export type TabId = (typeof TABS)[number];

const TAB_SET = new Set<string>(TABS as readonly string[]);
export const isValidTabId = (value: string | null): value is TabId =>
  value !== null && TAB_SET.has(value);

export interface NavigationItem {
  id: TabId;
  label: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { id: "overview", label: "Overview" },
  { id: "spectrum", label: "Spectrum" },
  { id: "measurements", label: "Measurements" },
  { id: "setup", label: "Analyzer Setup" },
  { id: "applications", label: "Applications" },
];

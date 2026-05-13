import { createContext, useContext } from "react";

export interface Theme {
  name: "scotland" | "england";
  /** Header accent bar color */
  headerBar: string;
  /** Icon container bg */
  iconBg: string;
  iconBgDark: string;
  /** Icon color */
  iconText: string;
  iconTextDark: string;
  /** Primary accent */
  accent: string;
  accentDark: string;
  /** Light bg (panels, summaries) */
  accentBgLight: string;
  accentBgLightDark: string;
  /** Border for accent panels */
  accentBorder: string;
  accentBorderDark: string;
  /** Text on accent bg */
  accentText: string;
  accentTextDark: string;
  accentTextMuted: string;
  accentTextMutedDark: string;
  /** Toggle / slider */
  toggle: string;
  slider: string;
  /** Focus ring */
  focusRing: string;
  focusBorder: string;
  /** Gradient for highlighted stat cards */
  gradientFrom: string;
  gradientTo: string;
  gradientAltFrom: string;
  gradientAltTo: string;
}

const scotland: Theme = {
  name: "scotland",
  headerBar: "bg-blue-600",
  iconBg: "bg-blue-100",
  iconBgDark: "dark:bg-blue-500/20",
  iconText: "text-blue-600",
  iconTextDark: "dark:text-blue-400",
  accent: "text-blue-600",
  accentDark: "dark:text-blue-400",
  accentBgLight: "bg-blue-50",
  accentBgLightDark: "dark:bg-blue-500/10",
  accentBorder: "border-blue-200",
  accentBorderDark: "dark:border-blue-500/30",
  accentText: "text-blue-700",
  accentTextDark: "dark:text-blue-300",
  accentTextMuted: "text-blue-600/70",
  accentTextMutedDark: "dark:text-blue-400/70",
  toggle: "bg-blue-600",
  slider: "accent-blue-600",
  focusRing: "focus:ring-blue-500",
  focusBorder: "focus:border-blue-500",
  gradientFrom: "from-blue-600",
  gradientTo: "to-blue-700",
  gradientAltFrom: "from-purple-500",
  gradientAltTo: "to-purple-600",
};

const england: Theme = {
  name: "england",
  headerBar: "bg-rose-600",
  iconBg: "bg-rose-100",
  iconBgDark: "dark:bg-rose-500/20",
  iconText: "text-rose-600",
  iconTextDark: "dark:text-rose-400",
  accent: "text-rose-600",
  accentDark: "dark:text-rose-400",
  accentBgLight: "bg-rose-50",
  accentBgLightDark: "dark:bg-rose-500/10",
  accentBorder: "border-rose-200",
  accentBorderDark: "dark:border-rose-500/30",
  accentText: "text-rose-700",
  accentTextDark: "dark:text-rose-300",
  accentTextMuted: "text-rose-600/70",
  accentTextMutedDark: "dark:text-rose-400/70",
  toggle: "bg-rose-600",
  slider: "accent-rose-600",
  focusRing: "focus:ring-rose-500",
  focusBorder: "focus:border-rose-500",
  gradientFrom: "from-rose-600",
  gradientTo: "to-rose-700",
  gradientAltFrom: "from-amber-500",
  gradientAltTo: "to-amber-600",
};

export function getTheme(scottishTax: boolean): Theme {
  return scottishTax ? scotland : england;
}

export const ThemeContext = createContext<Theme>(scotland);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

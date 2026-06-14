import type { CSSProperties } from "react";
import { usePlayer } from "../store/usePlayer";
import { THEMES } from "../themes/registry";
import { persist } from "../lib/persist";

export default function ThemeSwitcher() {
  const themeId = usePlayer((s) => s.themeId);
  const setTheme = usePlayer((s) => s.setTheme);

  function choose(id: string) {
    setTheme(id);
    persist.setTheme(id);
  }

  return (
    <div className="theme-switcher">
      {THEMES.map((t) => (
        <button
          key={t.id}
          className={`theme-chip ${t.id === themeId ? "active" : ""}`}
          style={{ "--accent": t.accent } as CSSProperties}
          onClick={() => choose(t.id)}
          title={t.description}
        >
          <span className="chip-dot" />
          {t.name}
        </button>
      ))}
    </div>
  );
}

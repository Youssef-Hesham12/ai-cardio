import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { updateData, useAppData } from "@/data/store";

export function PublicThemeToggle() {
  const { preferences } = useAppData();
  const dark = preferences.theme === "dark";
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      type="button"
      className="public-theme-toggle"
      aria-label="Toggle color theme"
      aria-pressed={dark}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={() =>
        updateData((data) => {
          data.preferences.theme = dark ? "light" : "dark";
        })
      }
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

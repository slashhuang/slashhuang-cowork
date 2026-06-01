"use client";

export type PreviewMode = "article" | "xhs" | "wechat-cover";

const MODES: { id: PreviewMode; label: string; emoji: string }[] = [
  { id: "article", label: "文章", emoji: "📝" },
  { id: "xhs", label: "小红书", emoji: "📱" },
  { id: "wechat-cover", label: "公众号封面", emoji: "📰" },
];

interface PreviewModeSwitcherProps {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onOpenThemePicker: () => void;
}

export function PreviewModeSwitcher({ mode, onModeChange, onOpenThemePicker }: PreviewModeSwitcherProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2"
      style={{ borderBottom: "1px solid var(--line-faint)", background: "var(--surface)" }}
    >
      <div className="flex gap-1">
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] transition-all"
              style={
                isActive
                  ? { background: "var(--ink)", color: "var(--paper)" }
                  : { background: "transparent", color: "var(--ink-soft)", border: "1px solid transparent" }
              }
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      {(mode === "xhs" || mode === "wechat-cover") && (
        <button
          onClick={onOpenThemePicker}
          className="rounded-lg px-2.5 py-1 text-[12px] transition-all"
          style={{
            background: "transparent",
            color: "var(--ink-soft)",
            border: "1px solid var(--line-faint)",
          }}
        >
          🎨 选择主题
        </button>
      )}
    </div>
  );
}

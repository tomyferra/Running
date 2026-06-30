export function Tooltip({ text, children }) {
  return (
    <span className="relative group inline-flex items-center gap-0.5 cursor-help">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block w-max max-w-[220px] text-center bg-ink border border-ink/20 text-paper font-mono text-xs rounded-lg px-2.5 py-1.5 shadow-xl leading-snug whitespace-normal">
        {text}
      </span>
    </span>
  )
}

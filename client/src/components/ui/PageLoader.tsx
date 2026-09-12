export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-surface-muted border-t-brand-400 animate-spin" />
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
      <div className="w-3.5 h-3.5 rounded-full border border-surface-muted border-t-brand-400 animate-spin flex-shrink-0" />
      Loading…
    </div>
  );
}

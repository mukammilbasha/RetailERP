export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="mt-1 text-xs text-destructive flex items-center gap-1">
      <span className="inline-block w-3 h-3 rounded-full bg-destructive/20 text-destructive text-[10px] flex items-center justify-center font-bold">!</span>
      {error}
    </p>
  );
}

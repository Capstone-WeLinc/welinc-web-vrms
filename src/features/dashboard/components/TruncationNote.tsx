// Shown when an API total is larger than the rows it returned, so a low count never looks complete.
export function TruncationNote({ rows }: { rows: number }) {
  return <p className="text-sm text-muted-foreground">Showing the first {rows} tickets, so counts may be low.</p>;
}

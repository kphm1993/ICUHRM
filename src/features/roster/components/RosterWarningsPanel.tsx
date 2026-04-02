interface RosterWarningsPanelProps {
  readonly warnings: ReadonlyArray<string>;
}

export function RosterWarningsPanel(props: RosterWarningsPanelProps) {
  return (
    <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-800">
          Engine Warnings
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-amber-950">
          Review Before Publish
        </h2>
      </div>

      {props.warnings.length > 0 ? (
        <ul className="space-y-2 text-sm text-amber-950">
          {props.warnings.map((warning) => (
            <li key={warning} className="rounded-2xl bg-white/80 px-4 py-3">
              {warning}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-amber-900">
          No engine warnings were returned for this snapshot.
        </p>
      )}
    </section>
  );
}

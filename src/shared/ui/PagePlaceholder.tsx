interface PlaceholderSection {
  readonly title: string;
  readonly items: ReadonlyArray<string>;
}

interface PagePlaceholderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly sections: ReadonlyArray<PlaceholderSection>;
  readonly footerNote?: string;
}

export function PagePlaceholder(props: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-panel backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          {props.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {props.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          {props.description}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {props.sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              {section.items.map((item) => (
                <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {props.footerNote ? (
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-3 text-sm text-brand-900">
          {props.footerNote}
        </div>
      ) : null}
    </section>
  );
}


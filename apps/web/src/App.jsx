export function App() {
  return <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 px-6 py-12">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Vinlook</p>
    <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Discover Ho Chi Minh City.</h1>
    <p className="text-lg leading-relaxed text-muted-foreground">Places to explore, walking routes and audio stories in your language.</p>
    <section aria-labelledby="status-heading" className="rounded-xl border border-border bg-card p-5">
      <h2 id="status-heading" className="font-semibold">The guide is being built</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">This early preview does not yet include maps, directions or audio guides.</p>
    </section>
  </main>;
}

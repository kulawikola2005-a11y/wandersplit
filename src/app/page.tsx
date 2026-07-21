export const metadata = {
  title: "WanderSplit",
  description: "Group travel planner + shared budget splitting, stops, route, weather, public share link, PDF export.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl border bg-gray-50" />
          <div>
            <div className="text-sm font-semibold">WanderSplit</div>
            <div className="text-xs text-gray-500">Travel · Budget · Route · Weather</div>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <a className="rounded-xl border px-4 py-2 text-sm" href="/trips">
            Open app
          </a>
          <a className="rounded-xl bg-black px-4 py-2 text-sm text-white" href="/trips?demo=1">
            Try demo
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-6">
        <div className="rounded-[28px] border bg-gradient-to-b from-gray-50 to-white p-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight">
              Plan podróży i rozliczenia grupowe — w jednej appce.
            </h1>
            <p className="mt-4 text-base text-gray-600">
              WanderSplit to MVP do portfolio: plan dni, stops na trasie, mapa, pogoda, zaproszenia do tripa,
              publiczny read-only link i eksport do PDF.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <a className="rounded-xl bg-black px-5 py-3 text-sm text-white" href="/trips?demo=1">
                Start demo (1 klik)
              </a>
              <a className="rounded-xl border px-5 py-3 text-sm" href="/trips">
                Przejdź do aplikacji
              </a>
              <a className="rounded-xl border px-5 py-3 text-sm" href="/share">
                Zobacz public share (wklej token)
              </a>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Tip: demo tworzy trip + plan + checklist + stops + budżet + invite code.
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 pb-6">
        <h2 className="text-lg font-semibold">Co pokazuje ten projekt</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">Rozliczenia grupowe</div>
            <p className="mt-2 text-sm text-gray-600">
              Wydatki + podziały + saldo per osoba + “kto komu ile”.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">Plan podróży</div>
            <p className="mt-2 text-sm text-gray-600">
              Itinerary po dniach, statusy, notatki, linki.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">Stops + mapa</div>
            <p className="mt-2 text-sm text-gray-600">
              Lista miejsc + drag&drop kolejności + trasa na mapie.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">Pogoda</div>
            <p className="mt-2 text-sm text-gray-600">
              Prognoza dla każdego stopa (Open-Meteo).
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">Share (multi-user + public)</div>
            <p className="mt-2 text-sm text-gray-600">
              Invite code do dołączenia + public read-only link bez logowania.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium">PDF export</div>
            <p className="mt-2 text-sm text-gray-600">
              Gotowy output do wysłania: plan + stops + budżet + rozliczenia.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-8">
        <div className="rounded-2xl border p-6">
          <h2 className="text-lg font-semibold">Jak szybko to przetestować</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Kliknij <b>Try demo</b> — utworzy przykładowy trip.</li>
            <li>Wejdź w <b>Invite</b> i otwórz link w incognito, żeby dołączyć drugim kontem.</li>
            <li>Dodaj wydatek i zobacz rozliczenia.</li>
            <li>Utwórz <b>Public link</b> i wyślij komuś do podglądu (bez logowania).</li>
            <li>Zrób <b>Export PDF</b>.</li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <a className="rounded-xl bg-black px-5 py-3 text-sm text-white" href="/trips?demo=1">
              Uruchom demo teraz
            </a>
            <a className="rounded-xl border px-5 py-3 text-sm" href="/trips">
              Open app
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-gray-500">
          <div>WanderSplit · portfolio MVP</div>
          <div className="flex gap-3">
            <a className="underline" href="/trips">App</a>
            <a className="underline" href="/login">Login</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
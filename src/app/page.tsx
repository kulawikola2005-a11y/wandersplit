export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold">WanderSplit</h1>
      <p className="mt-2 text-gray-700">
        Plan podróży + budżet grupowy + trasa + pogoda (MVP).
      </p>

      <a
        className="mt-6 inline-block rounded-xl bg-black px-5 py-3 text-white"
        href="/login"
      >
        Wejdź do aplikacji
      </a>
    </main>
  );
}

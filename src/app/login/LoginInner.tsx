"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/trips";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim()) {
      setMsg("Wpisz email i hasło.");
      return;
    }

    setLoading(true);
    setMsg(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/trips`,
        },
      });

      setLoading(false);

      if (error) setMsg(error.message);
      else setMsg("Konto utworzone. Sprawdź email i potwierdź rejestrację.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) setMsg(error.message);
    else window.location.href = next;
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f6f4ff_0%,#f8fafc_35%,#ffffff_100%)] px-4 py-8">
      <div className="mx-auto max-w-[430px] space-y-5">
        <section className="rounded-[36px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_60%,#8b5cf6_100%)] p-6 text-white shadow-[0_28px_80px_rgba(124,58,237,0.24)]">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
            WanderSplit
          </div>
          <h1 className="mt-3 text-[34px] font-black tracking-tight">
            {mode === "login" ? "Zaloguj się" : "Załóż konto"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Zapisuj podróże, budżety i plany na swoim koncie.
          </p>
        </section>

        <section className="rounded-[34px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-2 gap-2 rounded-[24px] bg-violet-50 p-1">
            <button
              onClick={() => setMode("login")}
              className={mode === "login" ? "rounded-[20px] bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm" : "rounded-[20px] px-4 py-3 text-sm font-bold text-slate-500"}
            >
              Login
            </button>
            <button
              onClick={() => setMode("signup")}
              className={mode === "signup" ? "rounded-[20px] bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm" : "rounded-[20px] px-4 py-3 text-sm font-bold text-slate-500"}
            >
              Konto
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <input
              className="w-full rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4 text-sm font-bold text-slate-950 outline-none"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="w-full rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4 text-sm font-bold text-slate-950 outline-none"
              placeholder="hasło"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />

            <button
              onClick={submit}
              disabled={loading}
              className="w-full rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:opacity-50"
            >
              {loading ? "Chwila..." : mode === "login" ? "Zaloguj się" : "Załóż konto"}
            </button>

            {msg ? (
              <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                {msg}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

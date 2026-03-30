"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/trips";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Konto utworzone. Teraz kliknij Sign in.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else window.location.href = next;
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">WanderSplit — login</h1>
      <p className="mt-1 text-sm text-gray-600">Logowanie email + hasło (lokalnie).</p>

      <div className="mt-6 space-y-3">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border p-3"
          placeholder="hasło"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={signUp}
            disabled={loading}
            className="rounded-xl border px-4 py-2"
          >
            Sign up
          </button>
          <button
            onClick={signIn}
            disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-white"
          >
            Sign in
          </button>
        </div>

        {msg ? <p className="text-sm text-gray-700">{msg}</p> : null}
      </div>
    </div>
  );
}
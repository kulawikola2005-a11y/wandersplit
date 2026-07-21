"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User, Mail, Camera, Trash2, LogOut, Save } from "lucide-react";

export default function ProfilePage() {
  const [email, setEmail] = useState("aleksandra@example.com");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setEmail(localStorage.getItem("wandersplit:profileEmail") || "aleksandra@example.com");
    setAvatar(localStorage.getItem("wandersplit:profileAvatar"));
  }, []);

  function saveProfile() {
    localStorage.setItem("wandersplit:profileEmail", email.trim() || "aleksandra@example.com");
    setMsg("Profil zapisany.");
    setTimeout(() => setMsg(null), 1500);
  }

  function onAvatarChange(file: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;

      localStorage.setItem("wandersplit:profileAvatar", dataUrl);
      setAvatar(dataUrl);
      setMsg("Zdjęcie profilowe zapisane.");
      setTimeout(() => setMsg(null), 1500);
    };

    reader.readAsDataURL(file);
  }

  function clearDemoData() {
    const ok = window.confirm("Czy na pewno wyczyścić dane aplikacji?");
    if (!ok) return;

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("wandersplit:")) localStorage.removeItem(key);
    });

    window.location.href = "/trips";
  }

  async function logoutDemo() {
    await import("@/lib/supabase/client").then(({ supabase }) => supabase.auth.signOut());
    localStorage.removeItem("wandersplit:isLoggedIn");
    localStorage.removeItem("wandersplit:demoUserId");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f6f4ff_0%,#f8fafc_32%,#ffffff_100%)] px-4 py-6">
      <div className="mx-auto max-w-[430px] space-y-5">
        <Link href="/trips" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
          ← Moje podróże
        </Link>

        <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_55%,#8b5cf6_100%)] p-6 text-white shadow-[0_28px_80px_rgba(124,58,237,0.25)]">
          <div className="flex items-center gap-4">
            <label className="relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[28px] bg-white/18 text-white backdrop-blur ring-1 ring-white/20">
              {avatar ? (
                <img src={avatar} alt="Zdjęcie profilowe" className="h-full w-full object-cover" />
              ) : (
                <User size={32} />
              )}

              <div className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-violet-700 shadow-sm">
                <Camera size={14} />
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="min-w-0">
              <div className="text-[28px] font-black tracking-tight">
                Profil
              </div>
              <p className="mt-1 truncate text-sm leading-6 text-white/75">
                {email}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-500">
            Email
          </label>

          <div className="mt-3 flex items-center gap-3 rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4">
            <Mail size={20} className="shrink-0 text-violet-700" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twój@email.com"
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none"
            />
          </div>

          <button
            onClick={saveProfile}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-black text-white"
          >
            <Save size={18} />
            Zapisz profil
          </button>

          {msg ? (
            <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {msg}
            </div>
          ) : null}
        </section>

        <section className="rounded-[34px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <button
            onClick={logoutDemo}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-slate-950 px-5 py-4 text-sm font-black text-white"
          >
            <LogOut size={18} />
            Wyloguj
          </button>

          <button
            onClick={clearDemoData}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-600"
          >
            <Trash2 size={18} />
            Wyczyść dane aplikacji
          </button>
        </section>
      </div>
    </main>
  );
}

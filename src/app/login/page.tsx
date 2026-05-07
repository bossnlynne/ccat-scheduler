"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = username.trim();
    const trimmedPin = pin.trim();

    if (!trimmed) {
      setError("請輸入使用者名稱");
      return;
    }
    if (!/^[a-zA-Z]+$/.test(trimmed)) {
      setError("使用者名稱只能包含英文字母");
      return;
    }
    if (!trimmedPin || !/^\d{4,6}$/.test(trimmedPin)) {
      setError("PIN 須為 4～6 位數字");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, pin: trimmedPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }

      router.push("/");
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "#f5f3ef" }}>
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] text-center">
          貓咪照護排程
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-[#8a8580]">
              使用者名稱
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如：Lynne"
              className="mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0aaa5] focus:border-[#1a1a1a] focus:outline-none"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-xs font-medium text-[#8a8580]">
              PIN 碼
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4～6 位數字"
              className="mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0aaa5] focus:border-[#1a1a1a] focus:outline-none"
              style={{ fontSize: "16px" }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-[#1a1a1a] bg-[#1a1a1a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="border border-[#e0ddd8] px-3 py-1.5 text-xs text-[#8a8580] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]"
    >
      登出
    </button>
  );
}

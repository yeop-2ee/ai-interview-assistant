"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@/components/Icons";

export function StartButton() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
  }, []);

  return (
    <button
      onClick={() => router.push(isLoggedIn ? "/setup" : "/login")}
      className="inline-flex items-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-[15px] shadow-lg shadow-[#4f52e8]/30"
    >
      지금 시작하기 <IconArrowRight className="w-4 h-4" />
    </button>
  );
}

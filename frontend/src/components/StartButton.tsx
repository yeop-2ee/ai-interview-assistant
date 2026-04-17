"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@/components/Icons";

export function StartButton({ variant = "solid" }: { variant?: "solid" | "text" }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
  }, []);

  const dest = isLoggedIn ? "/setup" : "/login";

  if (variant === "text") {
    return (
      <button
        onClick={() => router.push(dest)}
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4f52e8] hover:gap-3 transition-all"
      >
        지금 체험해보기 <IconArrowRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push(dest)}
      className="inline-flex items-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-[15px] shadow-lg shadow-[#4f52e8]/30"
    >
      지금 시작하기 <IconArrowRight className="w-4 h-4" />
    </button>
  );
}

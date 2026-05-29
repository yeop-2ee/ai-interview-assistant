"use client"

import { useSessionGuard } from "@/hooks/useSessionGuard"

export function SessionGuardProvider({ children }: { children: React.ReactNode }) {
  useSessionGuard()
  return <>{children}</>
}

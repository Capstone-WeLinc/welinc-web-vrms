import type { CSSProperties } from "react"
import { Toaster as Sonner } from "sonner"

import { useIsMobile } from "@/hooks/useIsMobile"
import { MAX_TOASTS } from "@/context/toast"

/*
  Suite spec 0016 AC-11: sonner only stacks and swipes; every toast is our own Toast (showToast
  in context/toast.ts). Bottom right from 768px up, top center below it, at most 3, 380px wide,
  in the toast layer (z 40).
*/
const toasterStyle = {
  "--width": "380px",
  zIndex: 40,
} as CSSProperties

function Toaster() {
  const isMobile = useIsMobile()
  return (
    <Sonner
      position={isMobile ? "top-center" : "bottom-right"}
      visibleToasts={MAX_TOASTS}
      gap={8}
      offset={24}
      mobileOffset={8}
      style={toasterStyle}
      toastOptions={{ unstyled: true, className: "w-full" }}
    />
  )
}

export { Toaster }

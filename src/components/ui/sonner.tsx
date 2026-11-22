import { useEffect, useState, type CSSProperties } from "react"
import { Toaster as Sonner } from "sonner"

import { registerAlertAnnouncer } from "@/context/toast"
import { useIsMobile } from "@/hooks/useIsMobile"

const tokenStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius-xl, 0.75rem)",
} as CSSProperties

function Toaster() {
  const isMobile = useIsMobile()
  const [alert, setAlert] = useState({ id: 0, message: "" })

  useEffect(() => {
    registerAlertAnnouncer((message) =>
      setAlert((prev) => ({ id: prev.id + 1, message }))
    )
    return () => registerAlertAnnouncer(null)
  }, [])

  return (
    <>
      <Sonner
        position={isMobile ? "top-center" : "bottom-right"}
        visibleToasts={3}
        style={tokenStyle}
        toastOptions={{
          classNames: {
            toast: "font-sans shadow-lg",
            description: "text-muted-foreground",
            success: "[&_[data-icon]]:text-success",
            error: "[&_[data-icon]]:text-destructive",
            info: "[&_[data-icon]]:text-primary",
          },
        }}
      />
      {/* A fresh node per error, so a repeated message is announced again. */}
      <div role="alert" className="sr-only">
        {alert.message && <p key={alert.id}>{alert.message}</p>}
      </div>
    </>
  )
}

export { Toaster }

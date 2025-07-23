import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    // This effect only runs on the client, after the initial render.
    // This safely avoids hydration mismatches.
    const checkDevice = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set the initial value on the client
    checkDevice();
    
    // Add event listener to check on resize
    window.addEventListener("resize", checkDevice);
    
    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", checkDevice);
  }, [])

  return isMobile
}

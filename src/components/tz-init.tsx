"use client";

import { useEffect } from "react";

export function TimezoneInit() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const cookie = "tz=" + encodeURIComponent(tz);
      if (document.cookie.indexOf(cookie) === -1) {
        document.cookie = cookie + ";path=/;max-age=31536000;samesite=lax";
      }
    } catch {}
  }, []);
  return null;
}

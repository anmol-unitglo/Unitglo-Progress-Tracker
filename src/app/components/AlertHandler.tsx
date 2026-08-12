"use client";

import { useEffect } from "react";
import Swal from "sweetalert2";

export default function AlertHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const alert = params.get("alert");
    const msg = params.get("msg");
    if (alert && msg) {
      Swal.fire({
        icon: alert === "success" ? "success" : "error",
        title: decodeURIComponent(msg),
        timer: 3000,
        showConfirmButton: false,
      });
      // Clear query params after showing alert
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  // No UI rendered
  return null;
}

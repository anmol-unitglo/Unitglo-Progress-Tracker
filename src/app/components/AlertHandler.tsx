"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

function AlertHandlerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const alert = searchParams.get("alert");
    const msg = searchParams.get("msg");
    
    if (alert && msg) {
      Swal.fire({
        icon: alert === "success" ? "success" : "error",
        title: decodeURIComponent(msg),
        timer: 3000,
        showConfirmButton: false,
      });
      
      // Remove query params
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("alert");
      newParams.delete("msg");
      const newUrl = window.location.pathname + (newParams.toString() ? `?${newParams.toString()}` : '');
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}

export default function AlertHandler() {
  return (
    <Suspense fallback={null}>
      <AlertHandlerInner />
    </Suspense>
  );
}

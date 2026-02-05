"use client";

import { useSearchParams } from "next/navigation";

export default function LoginHtmlPreview() {
  const params = useSearchParams();
  const page = params.get("page") ?? "login"; // login | signin

  return (
    <iframe
      src={`/sandbox/login-html/${page}.html`}
      style={{ width: "100%", height: "100vh", border: "none" }}
    />
  );
}

"use client";

import { ClipLoader } from "react-spinners";

/** Full-viewport centered spinner, used as the content of route `loading.tsx` files. */
export function PageSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        width: "100%",
      }}
    >
      <ClipLoader color="#00b8d9" size={40} aria-label="Loading" />
    </div>
  );
}

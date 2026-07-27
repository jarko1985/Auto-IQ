"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[#f7fafd] font-sans">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold text-[#081a2f]">Something went wrong</h1>
          <p className="mb-6 text-[#44474d]">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="rounded-xl bg-[#081a2f] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

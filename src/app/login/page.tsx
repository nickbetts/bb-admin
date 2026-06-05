"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@bettsandburton.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await response.json()) as { error?: string; mustChangePassword?: boolean };
      if (!response.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      if (data.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#ece8df,transparent_45%),radial-gradient(circle_at_80%_80%,#e5ddcf,transparent_50%),linear-gradient(135deg,#f7f4ee_0%,#ece5d9_100%)] px-6 py-12"
    >
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center">
        <section className="w-full rounded-3xl border border-black/10 bg-white/90 p-8 shadow-[0_30px_80px_rgba(43,31,18,0.18)] backdrop-blur">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Image
              src="/images/logo-full-black.svg"
              alt="Betts & Burton"
              width={220}
              height={56}
              priority
            />
            <p className="text-sm font-medium tracking-[0.12em] text-black/60 uppercase">
              B&B Admin
            </p>
            <h1 className="text-2xl font-semibold text-neutral-900">Sign in</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-neutral-900 transition outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-neutral-900 transition outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

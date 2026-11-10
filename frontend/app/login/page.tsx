"use client";

import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useToastError } from "@/lib/use-toast-error";

type StoredAccount = {
  createdAt?: string;
  email: string;
  name: string;
  password: string;
  phone: string;
  nickname: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useToastError(errorMessage);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/cinema/login", {
        credentials: "same-origin",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const payload = (await response.json()) as {
        status?: string;
        message?: string;
        user?: {
          id: number;
          name: string;
          email: string;
          created_at?: string | null;
        };
      };

      if (!response.ok || !payload.user) {
        setErrorMessage(
          payload.message ??
            "ログインに失敗しました。しばらくしてから再度お試しください。",
        );
        setIsSubmitting(false);
        return;
      }

      const currentEmail = payload.user.email;
      const currentName = payload.user.name ?? "";

      const accountsRaw = window.localStorage.getItem("movieAccounts");
      let accounts: StoredAccount[] = [];

      if (accountsRaw) {
        try {
          const parsed = JSON.parse(accountsRaw);
          if (Array.isArray(parsed)) {
            accounts = parsed as StoredAccount[];
          }
        } catch {
          accounts = [];
        }
      }

      const accountIndex = accounts.findIndex(
        (account) =>
          String(account.email ?? "")
            .trim()
            .toLowerCase() === currentEmail.trim().toLowerCase(),
      );

      const nextAccount: StoredAccount = {
        createdAt: payload.user.created_at ?? "",
        email: currentEmail,
        name: currentName,
        password: "",
        phone: "",
        nickname: "",
      };

      if (accountIndex >= 0) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          password: "",
          createdAt: payload.user.created_at ?? accounts[accountIndex].createdAt ?? "",
          email: currentEmail,
          name: currentName,
        };
      } else {
        accounts.push(nextAccount);
      }

      window.localStorage.setItem("movieAccounts", JSON.stringify(accounts));
      window.localStorage.setItem("movieCurrentUserEmail", currentEmail);

      router.push("/mypage");
    } catch {
      setErrorMessage("通信エラーが発生しました。");
      setIsSubmitting(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />

      <main className="cinema-container flex justify-center py-10">
        <div className="w-full max-w-[460px]">
          <h1 className="mb-6 text-center text-[32px] font-bold">ログイン</h1>

          <div className="overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--surface-bg)]">
            <div className="border-b border-[var(--border-soft)] px-7 py-8 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                HAL CINEMA MEMBER
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                メールアドレスとパスワードを入力してください。
              </p>
            </div>

            <form method="post" action="/api/cinema/login" className="px-7 py-7" onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="mail@example.com"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  パスワード
                </label>
                <input
                  type="password"
                  name="password"
                  id="login-password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="パスワードを入力"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              {errorMessage ? (
                <p role="alert" className="mt-4 text-sm font-medium leading-6 text-[var(--danger)]">
                  {errorMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <p className="mt-4 text-sm text-[var(--text-secondary)]" aria-live="polite">
                  ログイン中です...
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 h-11 w-full rounded-[4px] bg-[var(--button-bg)] text-sm font-bold text-white transition hover:bg-[var(--button-hover)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-muted)]"
              >
                {isSubmitting ? "送信中..." : "ログイン"}
              </button>
            </form>

            <div className="border-t border-[var(--border-soft)] px-7 py-5 text-center">
              <Link
                href="/register"
                className="text-sm font-bold text-[var(--text-secondary)] underline underline-offset-4 transition hover:text-[var(--text-primary)]"
              >
                会員登録はこちら
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

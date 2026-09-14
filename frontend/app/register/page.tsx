"use client";

import Link from "next/link";
import CampaignHeader from "../components/CampaignHeader";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useToastError } from "@/lib/use-toast-error";
import { toast } from "@/lib/toast-store.mjs";

type StoredAccount = {
  createdAt?: string;
  email: string;
  name: string;
  password: string;
  phone: string;
  nickname: string;
};

export default function SigninPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
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

    if (form.password !== form.passwordConfirm) {
      setErrorMessage("パスワードが一致しません。");
      toast.error("パスワードが一致しません。");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/cinema/register", {
        credentials: "same-origin",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          password: form.password,
          phone: form.phone,
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
            "新規登録に失敗しました。しばらくしてから再度お試しください。",
        );
        setIsSubmitting(false);
        return;
      }

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

      const account: StoredAccount = {
        createdAt: payload.user.created_at ?? "",
        email: payload.user.email,
        name: payload.user.name,
        password: "",
        phone: form.phone.trim(),
        nickname: "",
      };
      const accountIndex = accounts.findIndex(
        (storedAccount) => storedAccount.email.toLowerCase() === account.email.toLowerCase(),
      );

      if (accountIndex >= 0) {
        accounts[accountIndex] = { ...accounts[accountIndex], ...account };
      } else {
        accounts.push(account);
      }

      window.localStorage.setItem("movieAccounts", JSON.stringify(accounts));
      window.localStorage.setItem("movieCurrentUserEmail", account.email);
    } catch {
      setErrorMessage("通信エラーが発生しました。");
      setIsSubmitting(false);
      return;
    }

    router.push("/mypage");
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <CampaignHeader />

      <main className="cinema-container flex justify-center py-10">
        <div className="w-full max-w-[520px]">
          <h1 className="mb-6 text-center text-[32px] font-bold">新規登録</h1>

          <div className="overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--surface-bg)]">
            <div className="border-b border-[var(--border-soft)] px-7 py-7 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                HAL CINEMA MEMBER
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                映画予約に使う会員情報を登録します。
              </p>
            </div>

            <form
              className="px-7 py-7"
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
              method="post"
              action="/api/cinema/register"
            >
              <div>
                <label htmlFor="register-name" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  名前
                </label>
                <input
                  type="text"
                  name="name"
                  id="register-name"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="HAL Taro"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="register-email" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  id="register-email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="mail@example.com"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="register-phone" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  電話番号
                  <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                    任意
                  </span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="register-phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="09012345678"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="register-password" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  パスワード
                </label>
                <input
                  type="password"
                  name="password"
                  id="register-password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="パスワードを入力"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="register-passwordConfirm" className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  name="passwordConfirm"
                  id="register-passwordConfirm"
                  autoComplete="new-password"
                  required
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="パスワードを入力"
                  className="h-11 w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--surface-bg)] px-3 text-sm outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
                />
              </div>

              {errorMessage ? (
                <p role="alert" className="mt-4 text-sm font-medium leading-6 text-[var(--danger)]">
                  {errorMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <p className="mt-4 text-sm text-[var(--text-secondary)]" aria-live="polite">
                  登録を送信中です...
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 h-11 w-full rounded-[4px] bg-[var(--button-bg)] text-sm font-bold text-white transition hover:bg-[var(--button-hover)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--text-muted)]"
              >
                {isSubmitting ? "送信中..." : "登録"}
              </button>
            </form>

            <div className="border-t border-[var(--border-soft)] px-7 py-5 text-center">
              <span className="mr-3 text-sm text-[var(--text-muted)]">登録済みの方</span>
              <Link
                href="/login"
                className="text-sm font-bold text-[var(--text-secondary)] underline underline-offset-4 transition hover:text-[var(--text-primary)]"
              >
                ログイン
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

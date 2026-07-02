"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

type StoredAccount = {
  email: string;
  name: string;
  password: string;
  phone: string;
  nickname: string;
};

export default function LoginPage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await fetch(`${apiBaseUrl}/api/login`, {
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
        email: currentEmail,
        name: currentName,
        password: "",
        phone: "",
        nickname: "",
      };

      if (accountIndex >= 0) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
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
    <main className="min-h-screen bg-[#F7F5F0] text-[#17130F]">
      <header className="flex h-16 items-center border-b border-[#DDD8CF] px-5 sm:px-8">
        <Link href="/" className="text-2xl font-black uppercase tracking-[0.18em]">
          HAL CINEMA
        </Link>
      </header>

      <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-12">
        <div className="w-full max-w-[368px]">
          <p className="mb-5 text-center text-xl font-bold">ログイン</p>

          <div className="overflow-hidden rounded-[6px] border border-[#D6D2CA] bg-white">
            <div className="border-b border-[#E4E0D8] px-7 py-8 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B8073]">
                HAL CINEMA MEMBER
              </p>
              <p className="mt-3 text-sm leading-6 text-[#5F574F]">
                登録済みのメールアドレスでマイページへ進みます。
              </p>
            </div>

            <form className="px-7 py-7" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-bold text-[#17130F]">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="mail@example.com"
                  className="h-11 w-full rounded-[4px] border border-[#D8D4CC] bg-white px-3 text-sm text-[#17130F] outline-none transition placeholder:text-[#A09A92] focus:border-[#17130F]"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-[#17130F]">
                  パスワード
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="password"
                  className="h-11 w-full rounded-[4px] border border-[#D8D4CC] bg-white px-3 text-sm text-[#17130F] outline-none transition placeholder:text-[#A09A92] focus:border-[#17130F]"
                />
              </div>

              {errorMessage ? (
                <p className="mt-4 text-sm font-medium leading-6 text-[#9A3A24]">
                  {errorMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <p className="mt-4 text-sm text-[#6E665D]" aria-live="polite">
                  ログイン中です...
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 h-11 w-full rounded-[4px] bg-[#25201B] text-sm font-bold text-white transition hover:bg-[#46382F] disabled:bg-[#CCC8C1] disabled:text-[#756D63]"
              >
                {isSubmitting ? "送信中..." : "ログイン"}
              </button>
            </form>

            <div className="border-t border-[#E4E0D8] px-7 py-5 text-center">
              <Link
                href="/register"
                className="text-sm font-bold text-[#6A625A] underline underline-offset-4 transition hover:text-[#17130F]"
              >
                会員登録はこちら
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

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
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8E1] px-6">
      <div className="w-full max-w-[520px]">
        <h1 className="mb-12 text-center text-3xl font-black uppercase tracking-[0.08em] text-[#1C0800]">
          アカウントにログイン
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="h-12 w-full border border-[#1C0800]/22 bg-white px-4 text-sm text-[#1C0800] outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              パスワード
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              className="h-12 w-full border border-[#1C0800]/22 bg-white px-4 text-sm text-[#1C0800] outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-[#C01818]">{errorMessage}</p>
          ) : null}

          {isSubmitting ? (
            <p className="text-sm text-[#8C5D2A]" aria-live="polite">
              ログイン中です...
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-10 h-12 w-full bg-[#E82020] text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#C01818] disabled:opacity-70"
          >
            {isSubmitting ? "送信中..." : "ログイン"}
          </button>
        </form>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#C8860A]/30" />
          <span className="text-sm text-[#8C5D2A]">Or</span>
          <div className="h-px flex-1 bg-[#C8860A]/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex h-11 items-center justify-center gap-2 border border-[#1C0800]/18 bg-white text-sm text-[#1C0800] transition hover:bg-[#FFF8E1]">
            <span className="font-bold text-[#E82020]">G</span>
            Sign in with Google
          </button>

          <button className="flex h-11 items-center justify-center gap-2 border border-[#1C0800]/18 bg-white text-sm text-[#1C0800] transition hover:bg-[#FFF8E1]">
            <span className="text-base">●</span>
            Sign in with Apple
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

export default function SigninPage() {
  const router = useRouter();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
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

    if (form.password !== form.passwordConfirm) {
      setErrorMessage("パスワードが一致しません。");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/register`, {
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
      };

      if (!response.ok) {
        setErrorMessage(
          payload.message ??
            "新規登録に失敗しました。しばらくしてから再度お試しください。",
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      setErrorMessage("通信エラーが発生しました。");
      setIsSubmitting(false);
      return;
    }

    router.push("/movie-main");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8E1] px-6 text-[#1C0800]">
      <div className="w-full max-w-[520px]">
        <h1 className="mb-10 text-center text-3xl font-black uppercase tracking-[0.08em]">
          新規登録
        </h1>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
          method="post"
          action={`${apiBaseUrl}/api/register`}
        >
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              名前
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="h-11 w-full border border-[#1C0800]/22 bg-white px-4 text-sm outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

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
              className="h-11 w-full border border-[#1C0800]/22 bg-white px-4 text-sm outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              電話番号
              <span className="ml-2 text-xs font-normal text-gray-500">
                任意
              </span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your Mobile Number"
              className="h-11 w-full border border-[#1C0800]/22 bg-white px-4 text-sm outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
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
              placeholder="Enter Password"
              className="h-11 w-full border border-[#1C0800]/22 bg-white px-4 text-sm outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-[#8C5D2A]">
              パスワード（確認）
            </label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Enter your Password"
              className="h-11 w-full border border-[#1C0800]/22 bg-white px-4 text-sm outline-none placeholder:text-[#A0703A] focus:border-[#E82020]"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-[#C01818]">{errorMessage}</p>
          ) : null}

          {isSubmitting ? (
            <p className="text-sm text-gray-600" aria-live="polite">
              登録を送信中です...
            </p>
          ) : null}

          {process.env.NODE_ENV !== "production" ? (
            <p className="text-xs text-gray-500">
              送信先: {`${apiBaseUrl}/api/register`}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-black px-8 py-3 text-white font-bold shadow-md transition hover:scale-105 hover:bg-gray-800"
          >
            {isSubmitting ? "送信中..." : "登録"}
          </button>
        </form>

        <div className="mt-10 border-t border-[#C8860A]/30 pt-4">
          <div className="flex items-center justify-center gap-5 text-sm text-[#8C5D2A]">
            <span>アカウントをお持ちの方はこちら</span>
            <span className="text-[#E82020]">→</span>
            <Link href="/login" className="font-bold text-[#E82020]">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { registerAccount } from "../../lib/authStorage.mjs";

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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.password !== form.passwordConfirm) {
      setErrorMessage("パスワードが一致しません。");
      return;
    }

    const result = registerAccount(window.localStorage, {
      email: form.email,
      name: form.name,
      password: form.password,
      phone: form.phone,
    }) as
      | { ok: true }
      | { ok: false; message: string };

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage("");
    router.push("/mypage");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <div className="w-full max-w-[520px]">
        <h1 className="mb-10 text-center text-3xl font-bold">新規登録</h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-bold">名前</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              電話番号
              <span className="ml-2 text-xs font-normal text-gray-500">任意</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your Mobile Number"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">パスワード</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter Password"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              パスワード（確認）
            </label>
            <input
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Enter your Password"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="mt-8 h-11 w-full rounded-md bg-[#4f73c9] text-sm font-bold text-white hover:bg-[#4264b6]"
          >
            登録
          </button>
        </form>

        <div className="mt-10 border-t border-gray-500 pt-4">
          <div className="flex items-center justify-center gap-5 text-sm text-gray-400">
            <span>アカウントをお持ちの方はこちら</span>
            <span className="text-blue-600">→</span>
            <Link href="/login" className="font-medium text-blue-600">
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

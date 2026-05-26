"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { loginAccount } from "../../lib/authStorage.mjs";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = loginAccount(window.localStorage, form) as
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
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-[520px]">
        <h1 className="mb-12 text-center text-3xl font-bold text-black">
          アカウントにログイン
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-bold text-black">
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm text-black outline-none focus:border-green-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-black">
              パスワード
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
              className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm text-black outline-none focus:border-green-700"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="mt-10 h-12 w-full rounded-md bg-[#356522] text-sm font-bold text-white hover:bg-[#284f19]"
          >
            ログイン
          </button>
        </form>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-black">Or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white text-sm text-black">
            <span className="font-bold text-blue-500">G</span>
            Sign in with Google
          </button>

          <button className="flex h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white text-sm text-black">
            <span className="text-base">●</span>
            Sign in with Apple
          </button>
        </div>
      </div>
    </main>
  );
}

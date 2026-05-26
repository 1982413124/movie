"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "../components/Header";
import {
  getCurrentAccount,
  logoutAccount,
  updateCurrentAccount,
} from "../../lib/authStorage.mjs";

type MenuKey = "profile" | "ticket" | "wishlist" | "settings" | "logout";
type StatusTone = "error" | "success";

type ProfileForm = {
  email: string;
  name: string;
  nickname: string;
  phone: string;
};

type Account = ProfileForm & {
  password: string;
};

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "profile", label: "プロフィール" },
  { key: "ticket", label: "チケット" },
  { key: "wishlist", label: "ウィッシュリスト" },
  { key: "settings", label: "設定" },
  { key: "logout", label: "ログアウト" },
];

const emptyForm: ProfileForm = {
  email: "",
  name: "",
  nickname: "",
  phone: "",
};

function toProfileForm(account: Account | null): ProfileForm {
  if (!account) {
    return emptyForm;
  }

  return {
    email: account.email ?? "",
    name: account.name ?? "",
    nickname: account.nickname ?? "",
    phone: account.phone ?? "",
  };
}

export default function MyPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("settings");
  const [currentAccount, setCurrentAccount] = useState<Account | null | undefined>(undefined);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const account = getCurrentAccount(window.localStorage) as Account | null;
      setCurrentAccount(account);
      setForm(toProfileForm(account));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setStatusMessage("");
  };

  const handleLogout = () => {
    logoutAccount(window.localStorage);
    setCurrentAccount(null);
    setForm(emptyForm);
    setStatusMessage("");
    setActiveMenu("settings");
  };

  const handleMenuClick = (menuKey: MenuKey) => {
    if (menuKey === "logout") {
      handleLogout();
      return;
    }

    setActiveMenu(menuKey);
  };

  const handleSave = () => {
    const result = updateCurrentAccount(window.localStorage, form) as
      | { ok: true; account: Account }
      | { ok: false; message: string };

    if (!result.ok) {
      setStatusTone("error");
      setStatusMessage(result.message);
      return;
    }

    setCurrentAccount(result.account);
    setForm(toProfileForm(result.account));
    setStatusTone("success");
    setStatusMessage("保存しました。");
  };

  if (currentAccount === undefined) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto flex min-h-[calc(100vh-97px)] max-w-3xl items-center justify-center px-6 py-10">
          <p className="text-sm text-[var(--text-muted)]">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (currentAccount === null) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
        <Header />

        <main className="mx-auto flex min-h-[calc(100vh-97px)] max-w-3xl items-center px-6 py-10">
          <section className="w-full rounded-2xl bg-[var(--surface-bg)] p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">マイページを利用するにはアカウント登録が必要です</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              ログイン済みでない場合は、ログインまたは新規登録に進んでください。
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="rounded-full border border-[var(--border-strong)] px-8 py-3 text-sm font-bold transition hover:bg-[var(--surface-muted)]"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-red-500 px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                新規登録
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const displayName = form.name || currentAccount.name || "ゲスト";
  const displayEmail = form.email || currentAccount.email;
  const displayNickname = `@${
    form.nickname.trim() ||
    currentAccount.nickname?.trim() ||
    displayEmail.split("@")[0] ||
    "user"
  }`;

  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />

      <div className="mx-6 mt-4 flex items-center gap-5 rounded-lg bg-[var(--surface-bg)] px-6 py-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--text-primary)]" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>

        <div>
          <div className="mb-1 text-xl font-bold">{displayName}</div>
          <div className="text-sm text-[var(--text-muted)]">{displayEmail}</div>
          <div className="text-sm text-[var(--text-muted)]">{displayNickname}</div>
        </div>
      </div>

      <div className="mx-6 mb-8 mt-4 flex items-start gap-4">
        <div className="w-44 flex-shrink-0 rounded-lg bg-[var(--surface-bg)] py-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleMenuClick(item.key)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                activeMenu === item.key ? "text-red-500" : "text-[var(--text-muted)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[var(--text-muted)]">›</span>
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-lg bg-[var(--surface-bg)] p-6">
          <h2 className="mb-5 text-base font-bold">アカウント設定</h2>

          <div className="mb-5">
            <label className="mb-2 block text-sm text-[var(--text-muted)]">プロフィール写真</label>
            <div className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)]">
              <svg viewBox="0 0 24 24" className="mb-1 h-8 w-8 text-[var(--text-muted)]" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
              <span className="text-center text-xs leading-tight text-[var(--text-muted)]">
                写真を
                <br />
                アップロード
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">名前</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="名前を入力"
                className="w-full rounded border border-red-500 bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">ニックネーム</label>
              <input
                type="text"
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Enter your username"
                className="w-full rounded border border-red-500 bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="メールアドレスを入力"
                className="w-full rounded border border-red-500 bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-muted)]">電話番号</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="番号を入力"
                className="w-full rounded border border-red-500 bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
          </div>

          {statusMessage ? (
            <p
              className={`mb-4 text-sm font-medium ${
                statusTone === "success" ? "text-green-700" : "text-red-600"
              }`}
            >
              {statusMessage}
            </p>
          ) : null}

          <div className="flex justify-center">
            <button
              type="button"
              className="rounded-full bg-red-500 px-20 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              onClick={handleSave}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

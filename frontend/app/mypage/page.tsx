"use client";

import { useState } from "react";
import Header from "../components/Header";

type MenuKey = "profile" | "ticket" | "wishlist" | "settings" | "logout";

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "profile",   label: "プロフィール" },
  { key: "ticket",    label: "チケット" },
  { key: "wishlist",  label: "ウィッシュリスト" },
  { key: "settings",  label: "設定" },
  { key: "logout",    label: "ログアウト" },
];

export default function MyPage() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("settings");

  // フォームの状態
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] font-sans text-[var(--text-primary)]">
      <Header />

      {/* ユーザー情報バー */}
      <div className="mx-6 mt-4 flex items-center gap-5 rounded-lg bg-[var(--surface-bg)] px-6 py-4">
        {/* アバター */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--text-primary)]" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>

        {/* ユーザー情報 */}
        <div>
          {/* (9) 名前 */}
          <div className="mb-1 text-xl font-bold">XXXX　XXX</div>
          {/* (10) メール */}
          <div className="text-sm text-[var(--text-muted)]">xxxxxxxxxxx@gmail.com</div>
          {/* (11) ユーザーネーム */}
          <div className="text-sm text-[var(--text-muted)]">@xxxxxxxxxx</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-6 mb-8 mt-4 flex items-start gap-4">

        {/* 左：ナビメニュー */}
        <div className="w-44 flex-shrink-0 rounded-lg bg-[var(--surface-bg)] py-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition ${
                activeMenu === item.key
                  ? "text-red-500"
                  : "text-[var(--text-muted)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[var(--text-muted)]">›</span>
            </button>
          ))}
        </div>

        {/* 右：アカウント設定フォーム */}
        <div className="flex-1 rounded-lg bg-[var(--surface-bg)] p-6">
          {/* (11) タイトル */}
          <h2 className="mb-5 text-base font-bold">アカウント設定</h2>

          {/* プロフィール写真 */}
          <div className="mb-5">
            <label className="mb-2 block text-sm text-[var(--text-muted)]">プロフィール写真</label>
            {/* (13) アップロードエリア */}
            <div className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)]">
              <svg viewBox="0 0 24 24" className="mb-1 h-8 w-8 text-[var(--text-muted)]" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
              <span className="text-center text-xs leading-tight text-[var(--text-muted)]">
                写真を<br />アップロード
              </span>
            </div>
          </div>

          {/* (12) 名前 ／ ニックネーム */}
          <div className="grid grid-cols-2 gap-4 mb-4">
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

          {/* (14) Email ／ (15) 電話番号 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
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

          {/* 保存ボタン */}
          <div className="flex justify-center">
            <button
              className="rounded-full bg-red-500 px-20 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              onClick={() => alert("保存しました")}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

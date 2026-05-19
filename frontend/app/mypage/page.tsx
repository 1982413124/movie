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
    <div className="font-sans min-h-screen" style={{ backgroundColor: "#6b7280" }}>
      <Header />

      {/* ユーザー情報バー */}
      <div
        className="mx-6 mt-4 rounded-lg px-6 py-4 flex items-center gap-5"
        style={{ backgroundColor: "#374151" }}
      >
        {/* アバター */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#6b7280" }}
        >
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>

        {/* ユーザー情報 */}
        <div>
          {/* (9) 名前 */}
          <div className="text-white text-xl font-bold mb-1">XXXX　XXX</div>
          {/* (10) メール */}
          <div className="text-gray-300 text-sm">xxxxxxxxxxx@gmail.com</div>
          {/* (11) ユーザーネーム */}
          <div className="text-gray-300 text-sm">@xxxxxxxxxx</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="mx-6 mt-4 mb-8 flex gap-4 items-start">

        {/* 左：ナビメニュー */}
        <div
          className="w-44 rounded-lg py-3 flex-shrink-0"
          style={{ backgroundColor: "#374151" }}
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition"
              style={{
                color: activeMenu === item.key ? "#ef4444" : "#d1d5db",
              }}
            >
              <span>{item.label}</span>
              <span className="text-gray-400">›</span>
            </button>
          ))}
        </div>

        {/* 右：アカウント設定フォーム */}
        <div
          className="flex-1 rounded-lg p-6"
          style={{ backgroundColor: "#374151" }}
        >
          {/* (11) タイトル */}
          <h2 className="text-white font-bold text-base mb-5">アカウント設定</h2>

          {/* プロフィール写真 */}
          <div className="mb-5">
            <label className="text-gray-300 text-sm block mb-2">プロフィール写真</label>
            {/* (13) アップロードエリア */}
            <div
              className="w-24 h-24 rounded flex flex-col items-center justify-center cursor-pointer border border-dashed border-gray-500"
              style={{ backgroundColor: "#4b5563" }}
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-400 mb-1" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
              <span className="text-gray-400 text-xs text-center leading-tight">
                写真を<br />アップロード
              </span>
            </div>
          </div>

          {/* (12) 名前 ／ ニックネーム */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-gray-300 text-xs block mb-1">名前</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="名前を入力"
                className="w-full rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                style={{ backgroundColor: "#4b5563", border: "1px solid #ef4444" }}
              />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">ニックネーム</label>
              <input
                type="text"
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Enter your username"
                className="w-full rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                style={{ backgroundColor: "#4b5563", border: "1px solid #ef4444" }}
              />
            </div>
          </div>

          {/* (14) Email ／ (15) 電話番号 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="text-gray-300 text-xs block mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="メールアドレスを入力"
                className="w-full rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                style={{ backgroundColor: "#4b5563", border: "1px solid #ef4444" }}
              />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">電話番号</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="番号を入力"
                className="w-full rounded px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                style={{ backgroundColor: "#4b5563", border: "1px solid #ef4444" }}
              />
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-center">
            <button
              className="px-20 py-2.5 rounded-full text-white font-bold text-sm transition hover:opacity-90"
              style={{ backgroundColor: "#ef4444" }}
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
import Link from "next/link";

export default function SinginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <div className="w-full max-w-[520px]">
        <h1 className="mb-10 text-center text-3xl font-bold">新規登録</h1>

        <form className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold">名前</label>
            <input
              type="text"
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
              placeholder="Enter your email"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">電話番号</label>
            <input
              type="tel"
              placeholder="Enter your Mobile Number"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">パスワード</label>
            <input
              type="password"
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
              placeholder="Enter your Password"
              className="h-11 w-full rounded-md border border-black px-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

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
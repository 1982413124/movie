import Link from "next/link";

export default function EmptyCompletion() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-800">
      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          <p className="text-sm font-semibold text-gray-500">
            購入完了
          </p>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">
            購入情報を確認できません
          </h1>
          <p className="mt-4 max-w-[58ch] text-sm leading-7 text-gray-600">
            座席選択から購入へ進んだ場合に、この画面で注文内容を表示します。
          </p>
          <Link
            href="/seats"
            className="mt-8 inline-flex rounded-lg bg-[var(--button-bg)] px-5 py-4 text-sm font-bold text-[var(--button-text)] transition-colors hover:bg-[var(--button-hover)]"
          >
            座席選択へ戻る
          </Link>
      </section>
    </main>
  );
}

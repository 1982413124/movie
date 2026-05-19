import Link from "next/link";

export default function EmptyConfirm() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-gray-800">
      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          <p className="text-sm font-semibold text-gray-500">
            購入確認
          </p>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">
            確認する購入内容がありません
          </h1>
          <p className="mt-4 max-w-[58ch] text-sm leading-7 text-gray-600">
            座席を選択してから購入内容の確認へ進んでください。
          </p>
          <Link
            href="/seats"
            className="mt-8 inline-flex rounded-lg bg-gray-700 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-gray-800"
          >
            座席選択へ戻る
          </Link>
      </section>
    </main>
  );
}

import Link from "next/link";
import { CalendarDaysIcon, TicketIcon, ShoppingBagIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import CampaignHeader from "../components/CampaignHeader";

const steps = [
  { title: "作品と上映日時を選ぶ", text: "上映中の作品から映画を選び、日にち・スクリーン・上映時間を指定します。", icon: CalendarDaysIcon },
  { title: "座席とチケットを選ぶ", text: "座席表の空席を選択し、一般・学生などの券種と枚数を指定します。座席数とチケット枚数を揃えてください。", icon: TicketIcon },
  { title: "フードを追加する", text: "商品と数量を選びます。チケットだけの予約は「今回は注文しない」で進めます。", icon: ShoppingBagIcon },
  { title: "内容を確認して予約する", text: "上映日時・座席・合計金額を確認し、お支払い方法を選択します。完了画面の予約番号を控えてください。", icon: CheckCircleIcon },
];
const questions = [
  ["予約内容はどこで確認できますか？", "ログイン後、マイページの「次の予約」または「購入履歴」から確認できます。作品・日時・座席に加え、注文したフードも表示します。"],
  ["フードを注文しなくても予約できますか？", "はい。フード選択画面で「今回は注文しない」を選ぶと、チケットのみで支払いへ進めます。"],
  ["フードはいつ、どこで受け取れますか？", "予約内容に表示される受取時間に、フード受取カウンターへお越しください。受取時間・場所はマイページの予約詳細でも確認できます。"],
  ["選んだ座席を変更できますか？", "購入前は、選択中の座席をもう一度押すと解除できます。支払い前に、上映日時と座席を確認してください。"],
  ["予約のキャンセルはどこからできますか？", "マイページの予約詳細にキャンセル操作が表示される予約が対象です。表示された対象内容と注意事項を確認してから手続きを行ってください。"],
  ["会員ランクはどこで確認できますか？", "ログイン後、トップページの会員エリアで今月のランク・利用状況・ランク特典を確認できます。"],
];

export const metadata = { title: "ご利用ガイド" };

export default function GuidePage() {
  return <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
    <CampaignHeader />
    <main className="cinema-container cinema-page">
      <header className="cinema-page-heading"><span className="cinema-eyebrow">ご来場の前に</span><h1>ご利用ガイド</h1><p>ご予約から当日のフード受取まで、ご利用の流れをご案内します。</p></header>
      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="ガイドの項目" className="cinema-card p-3 lg:sticky lg:top-28">
          <a href="#booking-guide" className="site-menu-link">予約の流れ<span aria-hidden="true">›</span></a>
          <a href="#visit-guide" className="site-menu-link">ご来場当日<span aria-hidden="true">›</span></a>
          <a href="#questions" className="site-menu-link">よくあるご質問<span aria-hidden="true">›</span></a>
        </nav>
        <div className="space-y-8">
          <section id="booking-guide" className="cinema-card scroll-mt-28 p-7"><h2 className="cinema-section-title">予約の流れ</h2>
            <ol className="mt-6 divide-y divide-[var(--border-soft)]">{steps.map((step, index) => <li key={step.title} className="flex gap-5 py-6 first:pt-0">
              <step.icon aria-hidden="true" className="h-8 w-8 shrink-0 text-[var(--accent)]" />
              <div><h3 className="font-bold"><span className="mr-3 text-[var(--accent)]">{index + 1}.</span>{step.title}</h3><p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.text}</p></div>
            </li>)}</ol><Link href="/movie-now" className="cinema-button mt-2">映画を選んで予約する</Link>
          </section>
          <section id="visit-guide" className="cinema-card scroll-mt-28 p-7"><h2 className="cinema-section-title">ご来場当日</h2>
            <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">ご来場前に、マイページで上映日時・スクリーン・座席をご確認ください。フードを注文した方は、表示された受取時間にフード受取カウンターへお越しください。</p>
            <Link href="/mypage" className="cinema-button cinema-button-secondary mt-5">マイページで予約を確認</Link>
          </section>
          <section id="questions" className="cinema-card scroll-mt-28 p-7"><h2 className="cinema-section-title">よくあるご質問</h2>
            <div className="mt-4">{questions.map(([question, answer]) => <details key={question} className="cinema-accordion"><summary>{question}</summary><div className="pb-5 text-sm leading-7 text-[var(--text-secondary)]">{answer}</div></details>)}</div>
          </section>
        </div>
      </div>
    </main>
  </div>;
}

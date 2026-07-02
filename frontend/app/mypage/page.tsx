"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";

import CampaignHeader from "../components/CampaignHeader";
import type { TicketHistory } from "../purchase-history/types";
import {
  getCurrentAccount,
  logoutAccount,
  updateCurrentAccount,
} from "../../lib/authStorage.mjs";
import { fetchReservationHistories } from "../../lib/purchaseHistoryApi.mjs";
import { createReservationSeatDisplay } from "../../lib/reservationSeatDisplay.mjs";

type MenuKey = "reservations" | "history" | "profile" | "settings" | "logout";
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

type MenuItem = {
  key: MenuKey;
  label: string;
  meta: string;
};

const MENU_ITEMS: MenuItem[] = [
  { key: "reservations", label: "予約状況", meta: "Reservations" },
  { key: "history", label: "購入履歴", meta: "History" },
  { key: "profile", label: "プロフィール", meta: "Profile" },
  { key: "settings", label: "設定", meta: "Settings" },
  { key: "logout", label: "ログアウト", meta: "Logout" },
];

const PROFILE_FIELDS: {
  name: keyof ProfileForm;
  label: string;
  placeholder: string;
  type: string;
}[] = [
  { name: "name", label: "名前", placeholder: "名前を入力", type: "text" },
  { name: "nickname", label: "ニックネーム", placeholder: "ユーザー名を入力", type: "text" },
  { name: "email", label: "Email", placeholder: "メールアドレスを入力", type: "email" },
  { name: "phone", label: "電話番号", placeholder: "番号を入力", type: "tel" },
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

function getSeatColumn(seat: string): number {
  const match = seat.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getSeatRow(seat: string): string {
  return seat.charAt(0).toUpperCase();
}

function OverviewMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="border border-[#D6CCBC] bg-[#F8F4EC] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-[#21160F]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#7C6F61]">{helper}</p>
    </div>
  );
}

function SeatMiniMap({ seats, screeningId }: { seats: string[]; screeningId?: string }) {
  const display = createReservationSeatDisplay(screeningId, seats);
  const gridTemplateColumns = `26px repeat(${display.columns.length}, 34px)`;

  return (
    <div className="border border-[#CFC4B4] bg-[#EFE8DC] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A6034]">
        <span>{display.screenName}</span>
        <span>{display.capacity} Seats</span>
      </div>
      <div className="max-h-[360px] overflow-x-auto overflow-y-auto pb-2">
        <div className="min-w-max pr-2">
          <div className="mx-auto mb-4 h-1.5 w-64 max-w-[60%] bg-[#2B2119]" />
          <div
            className="mb-2 grid gap-x-1 text-center font-mono text-[10px] text-[#8A6034]"
            style={{ gridTemplateColumns }}
          >
            <span />
            {display.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          <div className="grid gap-y-1.5">
            {display.rows.map((row) => (
              <div
                key={row.row}
                className="grid items-center gap-x-1"
                style={{ gridTemplateColumns }}
              >
                <span className="font-mono text-[11px] font-bold text-[#8A6034]">
                  {row.row}
                </span>
                {row.seats.map((seat) => (
                  <span
                    key={seat.id}
                    className={`h-6 border text-[0px] ${
                      seat.isSelected
                        ? "seat-pill border-[#2B2119] bg-[#2B2119]"
                        : "border-[#D6CCBC] bg-[#FBF8F1]"
                    }`}
                    aria-label={seat.id}
                    title={seat.id}
                  >
                    {seat.id}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function ReservationStatusPanel({ histories, notice = "" }: { histories: TicketHistory[]; notice?: string }) {
  const latestReservation = histories[0];
  const totalSeatCount = histories.reduce((total, history) => total + history.seats.length, 0);
  const totalPrice = histories.reduce((total, history) => total + history.totalPrice, 0);

  if (!latestReservation) {
    return (
      <section className="border-y border-[#D6CCBC] bg-[#FBF8F1]/72 px-5 py-10 sm:px-8 lg:px-10">
        <p className="text-sm text-[#6F6254]">{notice || "予約情報はまだありません。"}</p>
      </section>
    );
  }

  return (
    <section className="border-y border-[#D6CCBC] bg-[#FBF8F1]/72">
      <div className="grid gap-8 border-b border-[#D6CCBC] px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8A6034]">
            Reservation Status
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#21160F]">
            予約状況
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#6F6254]">
          直近の上映日時、スクリーン、予約した座席をまとめて確認できます。座席はスクリーン位置と合わせて見やすくしています。
        </p>
      </div>

      <div className="grid gap-7 px-5 py-8 sm:px-8 xl:grid-cols-[minmax(0,1.2fr)_360px] lg:px-10 lg:py-10">
        <article className="border border-[#CFC4B4] bg-[#F8F4EC] p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8A6034]">
                Next Booking
              </p>
              <h3 className="mt-4 text-2xl font-bold text-[#21160F]">
                {latestReservation.movieTitle}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#6F6254]">
                {latestReservation.showtime}
              </p>
              <p className="mt-1 text-sm font-bold text-[#4C4035]">
                {latestReservation.screen}
              </p>
            </div>
            <div className="w-full border-y border-[#D6CCBC] py-4 lg:w-56 lg:border-y-0 lg:border-l lg:py-0 lg:pl-6">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                Status
              </p>
              <p className="mt-2 text-2xl font-bold text-[#21160F]">
                {latestReservation.status}
              </p>
              <p className="mt-1 text-xs text-[#7C6F61]">
                {latestReservation.ticketCount}枚 / {formatPrice(latestReservation.totalPrice)}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-[#D6CCBC] pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                  Seats
                </p>
                <p className="mt-2 text-sm text-[#6F6254]">予約した座席</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {latestReservation.seats.map((seat) => (
                  <span
                    key={seat}
                    className="seat-pill inline-flex h-10 min-w-12 items-center justify-center border border-[#2B2119] bg-[#2B2119] px-3 text-sm font-bold text-[#FFF8E8]"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <SeatMiniMap seats={latestReservation.seats} screeningId={latestReservation.screeningId} />
            </div>
          </div>
        </article>

        <aside className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <OverviewMetric label="購入件数" value={`${histories.length}件`} helper="保存されている履歴" />
          <OverviewMetric label="予約座席" value={`${totalSeatCount}席`} helper="全履歴の座席数" />
          <OverviewMetric label="累計金額" value={formatPrice(totalPrice)} helper="チケット合計" />
          <Link
            href="/purchase-history"
            className="inline-flex h-12 items-center justify-center border border-[#2B2119] bg-[#2B2119] px-5 text-sm font-bold text-[#FFF8E8] transition hover:bg-[#4A3426] sm:col-span-3 xl:col-span-1"
          >
            購入履歴をすべて見る
          </Link>
        </aside>
      </div>
    </section>
  );
}

function PurchaseHistoryPanel({ histories, notice = "" }: { histories: TicketHistory[]; notice?: string }) {
  return (
    <section className="border-y border-[#D6CCBC] bg-[#FBF8F1]/72">
      <div className="grid gap-8 border-b border-[#D6CCBC] px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8A6034]">
            Purchase History
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#21160F]">
            購入履歴
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#6F6254]">
          購入日時、上映回、座席、合計金額を一覧で確認できます。明細は横長のチケットに近い比率で並べています。
        </p>
      </div>

      <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {histories.length === 0 ? (
          <p className="text-sm leading-7 text-[#6F6254]">
            {notice || "購入履歴はまだありません。"}
          </p>
        ) : (
          <div className="grid gap-4">
            {histories.map((history) => (
              <article
                key={history.id}
                className="grid gap-5 border border-[#CFC4B4] bg-[#F8F4EC] p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-stretch"
              >
                <div className="min-w-0">
                  <div className="flex flex-col gap-3 border-b border-[#D6CCBC] pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                        購入日時
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#4C4035]">{history.purchasedAt}</p>
                    </div>
                    <span className="inline-flex w-fit border border-[#2B2119] px-3 py-1 text-xs font-bold text-[#2B2119]">
                      {history.status}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-[#21160F]">{history.movieTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6F6254]">{history.showtime}</p>
                  <p className="mt-1 text-sm font-bold text-[#4C4035]">{history.screen}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="mr-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8A6034]">
                      座席
                    </span>
                    {history.seats.map((seat) => (
                      <span
                        key={seat}
                        className="seat-pill inline-flex h-8 min-w-10 items-center justify-center border border-[#2B2119] px-3 text-xs font-bold text-[#2B2119]"
                      >
                        {seat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid border-t border-[#D6CCBC] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <dl className="grid gap-4 self-center">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                        Tickets
                      </dt>
                      <dd className="mt-2 text-xl font-bold text-[#21160F]">{history.ticketCount}枚</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                        合計金額
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-[#21160F]">
                        {formatPrice(history.totalPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                        Seat Area
                      </dt>
                      <dd className="mt-2 text-sm font-bold text-[#4C4035]">
                        {getSeatRow(history.seats[0] ?? "-")}列 {getSeatColumn(history.seats[0] ?? "")}番から
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function ProfilePanel({ displayName, displayEmail, displayNickname }: {
  displayName: string;
  displayEmail: string;
  displayNickname: string;
}) {
  return (
    <section className="border-y border-[#D6CCBC] bg-[#FBF8F1]/72">
      <div className="grid gap-8 border-b border-[#D6CCBC] px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8A6034]">
            Profile
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#21160F]">
            プロフィール
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#6F6254]">
          アカウントの基本情報です。変更は設定メニューから行えます。
        </p>
      </div>

      <dl className="grid gap-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {[
          ["Name", displayName],
          ["Email", displayEmail],
          ["User", displayNickname],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-2 border-b border-[#D6CCBC] py-5 sm:grid-cols-[180px_1fr]">
            <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
              {label}
            </dt>
            <dd className="break-all text-base font-bold text-[#21160F]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SettingsPanel({
  form,
  statusMessage,
  statusTone,
  onChange,
  onSave,
}: {
  form: ProfileForm;
  statusMessage: string;
  statusTone: StatusTone;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) {
  return (
    <section className="min-w-0 border-y border-[#D6CCBC] bg-[#FBF8F1]/64">
      <div className="grid gap-8 border-b border-[#D6CCBC] px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8A6034]">
            Account Settings
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#21160F]">
            設定
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-[#6F6254]">
          名前、ニックネーム、メールアドレス、電話番号を編集できます。変更後は保存してください。
        </p>
      </div>

      <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <form
          className="min-w-0"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="grid gap-x-8 gap-y-7 md:grid-cols-2">
            {PROFILE_FIELDS.map((field) => (
              <label key={field.name} className="block">
                <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[#8A6034]">
                  {field.label}
                </span>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  className="mt-3 w-full border-0 border-b border-[#BCAF9D] bg-transparent px-0 py-3 text-base font-medium text-[#21160F] outline-none transition placeholder:text-[#A69A8A] focus:border-[#2B2119]"
                />
              </label>
            ))}
          </div>

          <div className="mt-8 min-h-6">
            {statusMessage ? (
              <p
                className={`text-sm font-bold ${
                  statusTone === "success" ? "text-[#33613B]" : "text-[#9A3A24]"
                }`}
              >
                {statusMessage}
              </p>
            ) : null}
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-[#D6CCBC] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-[#7C6F61]">
              名前とメールアドレスは必須です。
            </p>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center bg-[#2B2119] px-10 text-sm font-bold text-[#FFF8E8] transition hover:bg-[#4A3426] sm:min-w-[190px]"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function MyPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<MenuKey>("reservations");
  const [currentAccount, setCurrentAccount] = useState<Account | null | undefined>(undefined);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");
  const [histories, setHistories] = useState<TicketHistory[]>([]);
  const [historyNotice, setHistoryNotice] = useState("予約情報を読み込んでいます。");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const account = getCurrentAccount(window.localStorage) as Account | null;

      if (!account) {
        setCurrentAccount(null);
        router.replace("/login");
        return;
      }

      setCurrentAccount(account);
      setForm(toProfileForm(account));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [router]);

  useEffect(() => {
    if (!currentAccount?.email) {
      return;
    }

    let isActive = true;
    const frameId = window.requestAnimationFrame(() => {
      setHistoryNotice("予約情報を読み込んでいます。");

      fetchReservationHistories(currentAccount.email)
        .then((items: TicketHistory[]) => {
          if (isActive) {
            setHistories(items);
            setHistoryNotice("");
          }
        })
        .catch(() => {
          if (isActive) {
            setHistories([]);
            setHistoryNotice("予約情報を取得できませんでした。");
          }
        });
    });

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [currentAccount?.email]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setStatusMessage("");
  };

  const handleLogout = () => {
    logoutAccount(window.localStorage);
    setCurrentAccount(null);
    setForm(emptyForm);
    setStatusMessage("");
    setActiveMenu("reservations");
    router.replace("/");
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
      <div className="min-h-screen bg-[#F4F0E7] font-sans text-[#21160F]">
        <CampaignHeader />
        <main className="mx-auto flex min-h-[calc(100vh-97px)] max-w-3xl items-center justify-center px-6 py-10">
          <p className="text-sm text-[#6F6254]">読み込み中...</p>
        </main>
      </div>
    );
  }

  if (currentAccount === null) {
    return null;
  }

  const displayName = form.name || currentAccount.name || "ゲスト";
  const displayEmail = form.email || currentAccount.email;
  const displayNickname = `@${
    form.nickname.trim() ||
    currentAccount.nickname?.trim() ||
    displayEmail.split("@")[0] ||
    "user"
  }`;

  const activePanel = (() => {
    if (activeMenu === "reservations") {
      return <ReservationStatusPanel histories={histories} notice={historyNotice} />;
    }

    if (activeMenu === "history") {
      return <PurchaseHistoryPanel histories={histories} notice={historyNotice} />;
    }

    if (activeMenu === "profile") {
      return (
        <ProfilePanel
          displayName={displayName}
          displayEmail={displayEmail}
          displayNickname={displayNickname}
        />
      );
    }

    if (activeMenu === "settings") {
      return (
        <SettingsPanel
          form={form}
          statusMessage={statusMessage}
          statusTone={statusTone}
          onChange={handleChange}
          onSave={handleSave}
        />
      );
    }

    return null;
  })();

  return (
    <div className="min-h-screen bg-[#F4F0E7] font-sans text-[#21160F]">
      <CampaignHeader />

      <main className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <section className="border-b border-[#D6CCBC] pb-9">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-[#8A6034]">
                HAL CINEMA MEMBER
              </p>
              <h1 className="mt-5 text-6xl font-black leading-none tracking-normal text-[#21160F] sm:text-7xl lg:text-8xl xl:text-9xl">
                MY PAGE
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#6F6254] sm:text-base">
                予約状況、購入履歴、プロフィール情報をまとめて確認できます。
              </p>
            </div>

            <dl className="grid gap-4 border-y border-[#D6CCBC] py-5 text-sm text-[#4C4035]">
              <div className="flex items-center justify-between gap-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                  Name
                </dt>
                <dd className="font-bold">{displayName}</dd>
              </div>
              <div className="flex items-center justify-between gap-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                  Mail
                </dt>
                <dd className="break-all text-right">{displayEmail}</dd>
              </div>
              <div className="flex items-center justify-between gap-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8A6034]">
                  User
                </dt>
                <dd>{displayNickname}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[74px_minmax(0,1fr)]">
          <aside className="group/mypage-nav h-fit overflow-hidden border-y border-[#D6CCBC] bg-[#FBF8F1]/72 transition-[width] duration-300 lg:sticky lg:top-28 lg:w-[74px] lg:hover:w-[248px]">
            <div className="flex gap-2 overflow-x-auto p-2 lg:block lg:space-y-2 lg:overflow-hidden lg:p-3">
              <div className="hidden h-12 items-center gap-3 px-1 lg:flex">
                <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#2B2119] text-xs font-bold uppercase">
                  M
                </span>
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.32em] text-[#8A6034] opacity-0 transition-all duration-300 group-hover/mypage-nav:max-w-[140px] group-hover/mypage-nav:opacity-100">
                  Menu
                </span>
              </div>

              {MENU_ITEMS.map((item, index) => {
                const isActive = activeMenu === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleMenuClick(item.key)}
                    className={`flex min-w-[152px] items-center gap-3 border px-3 py-3 text-left transition lg:w-[220px] lg:min-w-0 ${
                      isActive
                        ? "border-[#2B2119] bg-[#2B2119] text-[#FFF8E8]"
                        : "border-transparent text-[#6F6254] hover:border-[#C7BBA9] hover:bg-[#EFE8DC]"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center border text-xs font-bold ${
                        isActive ? "border-[#FFF8E8]/35" : "border-[#C7BBA9]"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:transition-all lg:duration-300 lg:group-hover/mypage-nav:max-w-[150px] lg:group-hover/mypage-nav:opacity-100">
                      <span className="block whitespace-nowrap text-sm font-bold">{item.label}</span>
                      <span
                        className={`mt-1 block whitespace-nowrap text-[10px] uppercase tracking-[0.22em] ${
                          isActive ? "text-[#D8CBB9]" : "text-[#9A8268]"
                        }`}
                      >
                        {item.meta}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0">{activePanel}</div>
        </div>
      </main>
    </div>
  );
}

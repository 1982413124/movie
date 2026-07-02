"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { getCurrentAccount } from "../../lib/authStorage.mjs";
import { fetchReservationHistories } from "../../lib/purchaseHistoryApi.mjs";
import HistoryListHeader from "../components/HistoryListHeader";
import HistoryListItem from "../components/HistoryListItem";
import type { TicketHistory } from "./types";

type Account = {
  email: string;
};

type LoadState = "loading" | "guest" | "ready" | "error";

export default function PurchaseHistoryClient() {
  const [histories, setHistories] = useState<TicketHistory[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isActive = true;

    const frameId = window.requestAnimationFrame(() => {
      const account = getCurrentAccount(window.localStorage) as Account | null;

      if (!account?.email) {
        if (isActive) {
          setLoadState("guest");
        }
        return;
      }

      fetchReservationHistories(account.email)
        .then((items: TicketHistory[]) => {
          if (isActive) {
            setHistories(items);
            setLoadState("ready");
          }
        })
        .catch(() => {
          if (isActive) {
            setHistories([]);
            setLoadState("error");
          }
        });
    });

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div className="overflow-hidden border border-[#1C0800]/14">
      <HistoryListHeader />
      {renderBody(loadState, histories)}
    </div>
  );
}

function renderBody(loadState: LoadState, histories: TicketHistory[]) {
  if (loadState === "loading") {
    return <HistoryMessage>購入履歴を読み込んでいます。</HistoryMessage>;
  }

  if (loadState === "guest") {
    return (
      <HistoryMessage>
        購入履歴を確認するには
        <Link href="/login" className="mx-1 font-bold underline underline-offset-4">
          ログイン
        </Link>
        してください。
      </HistoryMessage>
    );
  }

  if (loadState === "error") {
    return <HistoryMessage>購入履歴を取得できませんでした。</HistoryMessage>;
  }

  if (histories.length === 0) {
    return <HistoryMessage>購入履歴はまだありません。</HistoryMessage>;
  }

  return (
    <ul>
      {histories.map((item) => (
        <li key={item.id}>
          <HistoryListItem history={item} />
        </li>
      ))}
    </ul>
  );
}

function HistoryMessage({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white px-6 py-10 text-sm leading-7 text-[#5C3010]">
      {children}
    </div>
  );
}
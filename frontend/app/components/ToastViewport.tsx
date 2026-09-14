"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast, toastStore } from "@/lib/toast-store.mjs";

type ToastItem = ReturnType<typeof toastStore.getSnapshot>[number];

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const isHidden = () => document.visibilityState === "hidden";
const serverHidden = () => false;

function subscribeContainer(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
  return () => observer.disconnect();
}
const getContainer = () => document.querySelector("dialog[open]") ?? document.body;
const serverContainer = () => null;

export default function ToastViewport() {
  const viewport = useRef<HTMLElement>(null);
  const notifications = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, serverHidden);
  const container = useSyncExternalStore(subscribeContainer, getContainer, serverContainer);

  useEffect(() => {
    const element = viewport.current;
    if (!element?.showPopover) return;
    // Keep notices reachable even while an admin confirmation dialog is open.
    if (element.matches(":popover-open")) element.hidePopover();
    if (notifications.length) element.showPopover();
  }, [notifications, container]);

  useEffect(() => {
    const unexpectedError = () => toast.event("error");
    const rejected = (event: PromiseRejectionEvent) => {
      if (event.reason?.name !== "AbortError") unexpectedError();
    };
    window.addEventListener("error", unexpectedError);
    window.addEventListener("unhandledrejection", rejected);
    return () => {
      window.removeEventListener("error", unexpectedError);
      window.removeEventListener("unhandledrejection", rejected);
    };
  }, []);

  if (!container) return null;

  return createPortal(
    <section ref={viewport} popover="manual" className="toast-viewport" aria-label="通知">
      <ol className="toast-list">
        {notifications.map(item => <ToastCard key={item.id} item={item} hidden={hidden} />)}
      </ol>
    </section>, container
  );
}

function ToastCard({ item, hidden }: { item: ToastItem; hidden: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(item.duration);
  const paused = hidden || hovered || focused;
  const Icon = item.tone === "success" ? CheckCircleIcon
    : item.tone === "info" ? InformationCircleIcon : ExclamationCircleIcon;

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [item.id, paused]);

  return (
    <li
      className="cinema-toast"
      data-tone={item.tone}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); toast.dismiss(item.id); } }}
    >
      <Icon className="toast-icon" aria-hidden="true" />
      <p role={item.tone === "error" ? "alert" : "status"} aria-atomic="true">{item.message}</p>
      <button type="button" className="toast-close" aria-label="通知を閉じる" onClick={() => toast.dismiss(item.id)}>
        <XMarkIcon aria-hidden="true" />
      </button>
    </li>
  );
}

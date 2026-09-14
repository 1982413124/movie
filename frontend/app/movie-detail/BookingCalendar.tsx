"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { CalendarDaysIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { addCinemaDays, calendarCells, cinemaDateParts, formatCinemaDate } from "@/lib/cinemaDate.mjs";
import type { CalendarDay } from "@/lib/screeningScheduleTypes";
import styles from "./booking.module.css";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

type Props = { selectedDate?: string; today?: string; dates: CalendarDay[]; disabled: boolean; onSelect: (date: string) => void };

export default function BookingCalendar({ selectedDate, today, dates, disabled, onSelect }: Props) {
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [focusedDate, setFocusedDate] = useState("");
  const enabledDates = dates.filter((date) => date.selectable);
  const months = [...new Set(enabledDates.map((date) => date.dateId.slice(0, 7)))].sort();
  const activeMonth = month || selectedDate?.slice(0, 7) || months[0];
  const monthIndex = months.indexOf(activeMonth);
  const cells = activeMonth ? calendarCells(activeMonth) : [];
  const dateMap = new Map(dates.map((date) => [date.dateId, date]));

  useEffect(() => {
    if (!isOpen) return;
    function outside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    dialog.current?.querySelector<HTMLButtonElement>('[data-date="' + focusedDate + '"]')?.focus();
  }, [isOpen, focusedDate]);

  function toggle() {
    if (!isOpen) {
      const initial = enabledDates.find((date) => date.dateId === selectedDate)?.dateId ?? enabledDates[0]?.dateId;
      if (!initial) return;
      setMonth(initial.slice(0, 7));
      setFocusedDate(initial);
    }
    setIsOpen(!isOpen);
  }

  function changeMonth(nextMonth: string) {
    if (!nextMonth) return;
    setMonth(nextMonth);
    setFocusedDate(enabledDates.find((date) => date.dateId.startsWith(nextMonth))?.dateId ?? "");
  }

  function onDayKey(event: KeyboardEvent<HTMLButtonElement>, dateId: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string | undefined;
    if (event.key in offsets) {
      const offset = offsets[event.key];
      const intended = addCinemaDays(dateId, offset);
      target = offset < 0
        ? enabledDates.filter((date) => date.dateId <= intended).at(-1)?.dateId
        : enabledDates.find((date) => date.dateId >= intended)?.dateId;
    } else if (event.key === "Home" || event.key === "End") {
      const weekday = cinemaDateParts(dateId).weekday;
      const start = addCinemaDays(dateId, -weekday);
      const end = addCinemaDays(start, 6);
      const week = enabledDates.filter((date) => date.dateId >= start && date.dateId <= end);
      target = event.key === "Home" ? week[0]?.dateId : week.at(-1)?.dateId;
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      changeMonth(months[monthIndex + (event.key === "PageUp" ? -1 : 1)]);
      return;
    } else return;
    event.preventDefault();
    if (target) { setMonth(target.slice(0, 7)); setFocusedDate(target); }
  }

  return (
    <div ref={wrapper} className={styles.calendarWrapper}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <span className={styles.fieldLabel} id={id + "-label"}>鑑賞日</span>
      <button ref={trigger} type="button" className={styles.dateTrigger} disabled={disabled || !enabledDates.length}
        aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined}
        aria-labelledby={id + "-label " + id + "-value"} onClick={toggle}>
        <CalendarDaysIcon aria-hidden="true" />
        <span id={id + "-value"}>{selectedDate ? formatCinemaDate(selectedDate, true) : "鑑賞日を選択"}</span>
        {selectedDate === today && <span className={styles.todayTag}>本日</span>}
        <ChevronDownIcon aria-hidden="true" className={isOpen ? styles.chevronOpen : ""} />
      </button>
      {isOpen && (
        <div ref={dialog} id={id} role="dialog" aria-label="鑑賞日のカレンダー" className={styles.calendarPopover}>
          <div className={styles.monthNavigation}>
            <button type="button" aria-label="前月" disabled={monthIndex <= 0}
              onClick={() => changeMonth(months[monthIndex - 1])}><ChevronLeftIcon aria-hidden="true" /></button>
            <h3 aria-live="polite">{activeMonth.split("-")[0]}年 {Number(activeMonth.split("-")[1])}月</h3>
            <button type="button" aria-label="翌月" disabled={monthIndex < 0 || monthIndex >= months.length - 1}
              onClick={() => changeMonth(months[monthIndex + 1])}><ChevronRightIcon aria-hidden="true" /></button>
          </div>
          <table className={styles.calendarGrid} role="grid" aria-label="鑑賞日を選ぶ" aria-describedby={id + "-help"}>
            <thead><tr>{weekdays.map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
            <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => (
              <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((dateId) => {
                const date = dateMap.get(dateId);
                const inMonth = dateId.startsWith(activeMonth);
                const selectable = inMonth && Boolean(date?.selectable);
                const selected = selectedDate === dateId;
                const isToday = dateId === today;
                const status = selectable ? date?.screeningCount + "回上映" : date?.screeningCount ? "予約期間外" : "上映なし・予約期間外";
                return (
                  <td key={dateId} role="gridcell" aria-selected={selected}>
                    <button type="button" data-date={dateId} disabled={!selectable} aria-disabled={!selectable}
                      tabIndex={dateId === focusedDate ? 0 : -1}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={formatCinemaDate(dateId, true) + (isToday ? " 本日" : "") + (selected ? " 選択中" : "") + " " + status}
                      className={[styles.calendarDay, selected ? styles.dateSelected : "", isToday ? styles.dateToday : "", !inMonth ? styles.otherMonth : ""].join(" ")}
                      onKeyDown={(event) => onDayKey(event, dateId)}
                      onClick={() => { onSelect(dateId); setIsOpen(false); trigger.current?.focus(); }}>
                      <span>{cinemaDateParts(dateId).day}</span>
                      <span className={styles.dayMarker} aria-hidden="true">{isToday ? (date?.screeningCount ? "● 本日" : "本日") : date?.screeningCount && inMonth ? "●" : ""}</span>
                    </button>
                  </td>
                );
              })}</tr>
            ))}</tbody>
          </table>
          <div className={styles.calendarLegend} id={id + "-help"}>
            <span><b aria-hidden="true">●</b> 上映あり</span><span>薄い日付は選択できません</span>
          </div>
          <p className={styles.calendarHelp}>矢印キーで移動・Enterで決定</p>
        </div>
      )}
    </div>
  );
}

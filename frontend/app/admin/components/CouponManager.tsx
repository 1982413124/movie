"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cinemaApi } from "@/lib/cinema-api";
import type { AdminSession } from "@/lib/cinema-types";
import { useNotice } from "./AdminShell";
import { ErrorState, LoadingRows } from "./Shared";

type Coupon = { id: number; code: string; name: string; discount_type: "FIXED" | "PERCENT"; discount_value: number; starts_at: string | null; expires_at: string; is_active: boolean; updated_at: string };
type CouponInput = Omit<Coupon,"id" | "updated_at"> & { updated_at?: string };
const jstInput = (value: string) => new Date(new Date(value).getTime()+9*60*60*1000).toISOString().slice(0,16);
const dateLabel = (value: string) => new Date(value).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});

export default function CouponManager({ session }: { session: AdminSession }) {
  const [coupons,setCoupons] = useState<Coupon[] | null>(null);
  const [editing,setEditing] = useState<Coupon | null>(null);
  const [error,setError] = useState("");
  const [formError,setFormError] = useState("");
  const [busy,setBusy] = useState(false);
  const [checkedAt,setCheckedAt] = useState(() => Date.now());
  const lock = useRef(false);
  const notify = useNotice();
  const load = useCallback(() => cinemaApi<{coupons:Coupon[]}>("admin/coupons")
    .then(result => { setCoupons(result.coupons); setCheckedAt(Date.now()); setError(""); })
    .catch((cause:Error) => setError(cause.message)),[]);
  useEffect(() => { void load(); },[load]);

  async function save(input: CouponInput, target: Coupon | null, disable = false) {
    if (lock.current) return;
    lock.current=true; setBusy(true); setFormError("");
    try {
      const result = await cinemaApi<{coupon:Coupon}>(target ? `admin/coupons/${target.id}` : "admin/coupons", {
        method: target ? "PUT" : "POST", body:JSON.stringify({...input,...(target ? {updated_at:target.updated_at} : {})}),
      },session.csrf_token);
      setCoupons(rows => target ? (rows ?? []).map(row => row.id===target.id ? result.coupon : row) : [result.coupon,...(rows ?? [])]);
      setEditing(null);
      setCheckedAt(Date.now());
      notify(disable ? "クーポンを無効にしました。" : target ? "クーポンを更新しました。" : "クーポンを作成しました。");
    } catch (cause) { const message=(cause as Error).message; setFormError(message); notify(message,true); }
    finally { lock.current=false; setBusy(false); }
  }
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!coupons) return <LoadingRows />;
  return <div className="admin-page-enter">
    <div className="admin-page-heading"><div><p className="eyebrow">COUPONS</p><h1>クーポン管理</h1><p className="admin-muted">コード・割引・有効期限を設定します。日時は日本時間です。</p></div><button className="admin-button secondary" disabled={busy} onClick={() => { setEditing(null); void load(); }}>一覧を更新</button></div>
    <div className="coupon-workspace">
      <section className="form-panel">
        <CouponForm key={editing ? `${editing.id}-${editing.updated_at}` : `new-${coupons.length}`} coupon={editing} busy={busy} error={formError} onCancel={() => {setEditing(null);setFormError("");}} onSave={input => void save(input,editing)} />
      </section>
      <section aria-label="登録済みクーポン" className="coupon-list">
        <h2>登録済みクーポン <span className="admin-muted">{coupons.length}件</span></h2>
        {coupons.length ? coupons.map(coupon => {
          const expired = Date.parse(coupon.expires_at)<=checkedAt;
          const upcoming = coupon.starts_at && Date.parse(coupon.starts_at)>checkedAt;
          const status = !coupon.is_active ? "無効" : expired ? "期限切れ" : upcoming ? "開始前" : "利用可能";
          return <article className="coupon-card" key={coupon.id}>
            <div className="coupon-card-top"><code>{coupon.code}</code><span className={`status-badge ${status==="利用可能" ? "status-now_showing" : "status-ended"}`}>{status}</span></div>
            <h3>{coupon.name}</h3><p className="coupon-value">{coupon.discount_type==="FIXED" ? `${coupon.discount_value.toLocaleString()}円引き` : `${coupon.discount_value}% OFF`}</p>
            <p className="admin-muted">開始：{coupon.starts_at ? dateLabel(coupon.starts_at) : "指定なし"}<br />期限：{dateLabel(coupon.expires_at)}</p>
            <div className="coupon-actions"><button disabled={busy} className="admin-button secondary" onClick={() => {setEditing(coupon);setFormError(""); document.getElementById("coupon-form-title")?.scrollIntoView({block:"center"});}}>編集</button><button className="admin-button secondary" disabled={busy || !coupon.is_active} onClick={() => void save({...coupon,is_active:false},coupon,true)}>無効化</button></div>
          </article>;
        }) : <div className="admin-empty"><h3>クーポンはまだありません</h3><p>最初のクーポンを作成してください。</p></div>}
      </section>
    </div>
  </div>;
}

function CouponForm({ coupon,busy,error,onCancel,onSave }: { coupon:Coupon|null;busy:boolean;error:string;onCancel:()=>void;onSave:(input:CouponInput)=>void }) {
  const [form,setForm] = useState(() => ({ code:coupon?.code ?? "",name:coupon?.name ?? "",discount_type:coupon?.discount_type ?? "FIXED",
    discount_value:String(coupon?.discount_value ?? 500),starts_at:coupon?.starts_at ? jstInput(coupon.starts_at) : "",
    expires_at:coupon ? jstInput(coupon.expires_at) : jstInput(new Date(Date.now()+7*86400000).toISOString()),is_active:coupon?.is_active ?? true }));
  function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({...form,discount_type:form.discount_type as Coupon["discount_type"],discount_value:Number(form.discount_value),
      starts_at:form.starts_at ? new Date(`${form.starts_at}+09:00`).toISOString() : null,
      expires_at:new Date(`${form.expires_at}+09:00`).toISOString()});
  }
  return <form onSubmit={submit}>
    <div className="form-section-heading"><div><h2 id="coupon-form-title">{coupon ? "クーポンを編集" : "クーポンを作成"}</h2><p>チケットとフードの合計に適用し、その後にポイントを差し引きます。</p></div></div>
    <fieldset disabled={busy}>
      <label className="admin-field">クーポンコード<input value={form.code} onChange={e => setForm({...form,code:e.target.value.toUpperCase()})} required minLength={3} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,39}" autoComplete="off" placeholder="例：CINEMA500" /></label>
      <label className="admin-field">名称<input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required maxLength={100} placeholder="例：秋の映画キャンペーン" /></label>
      <div className="field-row"><label className="admin-field">割引方式<select value={form.discount_type} onChange={e => setForm({...form,discount_type:e.target.value as Coupon["discount_type"]})}><option value="FIXED">固定額割引</option><option value="PERCENT">割合割引</option></select></label><label className="admin-field">{form.discount_type==="FIXED" ? "割引額（円）" : "割引率（%）"}<input type="number" min={1} max={form.discount_type==="PERCENT" ? 100 : 1000000000} step={1} required value={form.discount_value} onChange={e => setForm({...form,discount_value:e.target.value})} /></label></div>
      <label className="admin-field">利用開始日時（任意・日本時間）<input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form,starts_at:e.target.value})} /></label>
      <label className="admin-field">有効期限（日本時間）<input type="datetime-local" required value={form.expires_at} onChange={e => setForm({...form,expires_at:e.target.value})} /></label>
      <label className="admin-field">利用可否<select value={String(form.is_active)} onChange={e => setForm({...form,is_active:e.target.value==="true"})}><option value="true">有効</option><option value="false">無効</option></select></label>
      <div className="coupon-actions"><button className="admin-button primary" disabled={busy}>{busy ? "保存中…" : coupon ? "変更を保存" : "クーポンを作成"}</button>{coupon && <button type="button" className="admin-button secondary" onClick={onCancel}>編集をやめる</button>}</div>
    </fieldset>
    {error && <p className="admin-inline-error" role="alert">{error}</p>}
  </form>;
}

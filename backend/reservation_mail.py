"""Durable Resend outbox. Enqueue with the order; send only after commit in a worker."""
import hashlib
import json
import logging
import os
import re
import ssl
import time
from http.client import HTTPSConnection

from database.db import db_conn
from booking_benefits import BenefitError

logger = logging.getLogger(__name__)


def email_address(value):
    if not isinstance(value, str) or len(value) > 255 or not re.fullmatch(r'[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+', value):
        raise BenefitError('確認メールの送信先を正しいメールアドレスで入力してください。', 'invalid_email')
    return value


def enqueue_reservation_mail(cur, order_id, event_type):
    cur.execute('''SELECT user_email,order_num,subtotal_amount,coupon_code,coupon_discount_amount,
        points_used,points_earned,total_amount FROM orders WHERE id=%s''', (order_id,))
    recipient, order_num, subtotal, code, discount, used, earned, paid = cur.fetchone()
    if not recipient:
        return 'not_requested'
    # Old member records may contain a malformed address. Do not lose their reservation/cancellation.
    # The worker keeps a failed delivery pending; new guest input is validated before purchase.
    cur.execute('''SELECT rs.movie_title_at_purchase,sh.show_date,sh.start_time,rs.screen_name,
        COALESCE(s.seat_label,rs.seat_id) FROM reservation_seats rs
        JOIN showings sh ON sh.id=rs.showing_id LEFT JOIN seats s ON s.id=rs.seat_id
        WHERE rs.order_id=%s ORDER BY rs.id''', (order_id,))
    seats = cur.fetchall()
    heading = 'ご予約を承りました。' if event_type == 'CONFIRMED' else '予約のキャンセルが完了しました。'
    subject = f'HAL CINEMA｜{"予約確認" if event_type == "CONFIRMED" else "キャンセル完了"} {order_num}'
    lines = ['HAL CINEMA', '', heading, '', f'予約番号：{order_num}', f'予約ID：{order_id}']
    for title, day, start, screen, seat in seats:
        lines.append(f'{title} / {day:%Y/%m/%d} {start:%H:%M}（日本時間） / {screen} / 座席 {seat}')
    cur.execute('SELECT name,quantity,subtotal FROM food_order_details WHERE order_id=%s ORDER BY id', (order_id,))
    for name, quantity, amount in cur.fetchall():
        lines.append(f'フード：{name} × {quantity}（{amount:,}円）')
    lines.extend(['', f'割引前金額：{subtotal:,}円', f'クーポン割引{f"（{code}）" if code else ""}：{discount:,}円',
                  f'利用ポイント：{used:,}ポイント（{used:,}円）', f'最終支払額：{paid:,}円'])
    if event_type == 'CONFIRMED':
        lines.extend([f'獲得ポイント：{earned:,}ポイント', '', 'キャンセルは上映開始の1時間前までマイページから行えます。'])
    else:
        lines.extend([f'返還ポイント：{used:,}ポイント', f'取消ポイント：{earned:,}ポイント',
                      f'返金対象額：{paid:,}円', '', '座席とフード注文をキャンセルしました。'])
    lines.extend(['', '※現在のお支払い・返金はテスト決済の記録です。実際の請求・返金は発生しません。',
                  '予約内容はマイページの購入履歴から確認できます。'])
    cur.execute('''INSERT INTO reservation_email_outbox (order_id,event_type,recipient,subject,body)
        VALUES (%s,%s,%s,%s,%s) ON CONFLICT (order_id,event_type) DO NOTHING''',
                (order_id, event_type, recipient, subject, '\n'.join(lines)))
    return 'queued'


class ResendAPIError(RuntimeError):
    def __init__(self, status):
        self.status = status
        # Provider responses may contain recipient addresses. Keep only the HTTP status.
        super().__init__(f'Resend API returned HTTP {status}')


def resend_settings():
    if os.getenv('MAIL_ENABLED', 'false').lower() != 'true':
        return None
    sender = email_address(os.getenv('MAIL_FROM_ADDRESS', '').strip())
    api_key = os.getenv('RESEND_API_KEY', '').strip()
    if not api_key or not api_key.isascii() or any(character.isspace() for character in api_key):
        raise ValueError('RESEND_API_KEY is missing or invalid')
    return {'sender': sender, 'api_key': api_key}


def send_message(settings, outbox_id, recipient, subject, body):
    email_address(recipient)
    message = {'from': settings['sender'], 'to': [recipient], 'subject': subject, 'text': body,
               'headers': {'Message-ID': f'<hal-reservation-{outbox_id}@{settings["sender"].split("@")[1]}>'}}
    # Stable across retries/restarts, without exposing the recipient in the key.
    # The fingerprint also separates messages from different databases sharing an API key.
    fingerprint = hashlib.sha256(json.dumps([recipient, subject, body], ensure_ascii=False).encode('utf-8')).hexdigest()
    connection = HTTPSConnection('api.resend.com', timeout=10, context=ssl.create_default_context())
    try:
        connection.request('POST', '/emails', body=json.dumps(message, ensure_ascii=False).encode('utf-8'), headers={
            'Authorization': f'Bearer {settings["api_key"]}',
            'Content-Type': 'application/json',
            'User-Agent': 'HAL-CINEMA/1.0',
            'Idempotency-Key': f'hal-reservation-{outbox_id}-{fingerprint}',
        })
        response = connection.getresponse()
        if not 200 <= response.status < 300:
            raise ResendAPIError(response.status)
        result = json.loads(response.read())
        if not isinstance(result, dict) or not isinstance(result.get('id'), str) or not result['id'].strip():
            raise ValueError('Resend response did not contain an email ID')
        return result['id']
    finally:
        connection.close()


def deliver_batch(limit=20):
    settings = resend_settings()
    if settings is None:
        return {'sent': 0, 'failed': 0, 'enabled': False}
    result = {'sent': 0, 'failed': 0, 'enabled': True}
    for _ in range(limit):
        # This short transaction locks only an outbox row, never the order or point account.
        # SKIP LOCKED prevents two workers delivering the same message concurrently.
        with db_conn() as conn, conn.cursor() as cur:
            cur.execute('''SELECT q.id,q.recipient,q.subject,q.body,q.attempts FROM reservation_email_outbox q
                WHERE q.status='pending' AND q.next_attempt_at<=clock_timestamp()
                AND NOT EXISTS (SELECT 1 FROM reservation_email_outbox previous
                    WHERE previous.order_id=q.order_id AND previous.id<q.id AND previous.status<>'sent')
                ORDER BY q.id LIMIT 1 FOR UPDATE OF q SKIP LOCKED''')
            row = cur.fetchone()
            if not row:
                break
            try:
                send_message(settings, *row[:4])
            except Exception as exc:
                # Do not log credentials, mail contents or provider response bodies.
                error_name = f'ResendHTTP{exc.status}' if isinstance(exc, ResendAPIError) else type(exc).__name__[:100]
                delay = min(3600, 30 * 2 ** min(row[4], 7))
                cur.execute('''UPDATE reservation_email_outbox SET attempts=attempts+1,last_error=%s,
                    next_attempt_at=clock_timestamp()+(%s * INTERVAL '1 second') WHERE id=%s''', (error_name, delay, row[0]))
                logger.warning('Reservation email %s pending retry (%s)', row[0], error_name)
                result['failed'] += 1
            else:
                cur.execute('''UPDATE reservation_email_outbox SET status='sent',attempts=attempts+1,
                    sent_at=clock_timestamp(),last_error=NULL WHERE id=%s''', (row[0],))
                result['sent'] += 1
    return result


def run_worker():
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            result = deliver_batch()
            if result['sent'] or result['failed']:
                logger.info('Reservation mail batch: sent=%s failed=%s', result['sent'], result['failed'])
        except Exception as exc:
            logger.error('Mail worker is waiting; check configuration/DB (%s)', type(exc).__name__)
        time.sleep(10)

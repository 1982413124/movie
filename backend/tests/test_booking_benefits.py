"""Real-DB purchase/cancellation coverage, including concurrent spends and a local Resend stub."""
import os
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import test_admin_api as fixtures
from app import app
from database.db import db_conn
from reservation_policy import now_jst
from reservation_mail import deliver_batch
from resend_stub import ResendStub


@unittest.skipUnless(os.getenv('ADMIN_TEST_DATABASE_URL'), 'Requires isolated _test database')
class BookingBenefitsTest(unittest.TestCase):
    setUpClass = classmethod(fixtures.AdminApiTest.setUpClass.__func__)
    tearDownClass = classmethod(fixtures.AdminApiTest.tearDownClass.__func__)
    create = fixtures.AdminApiTest.create
    showing = fixtures.AdminApiTest.showing

    def setUp(self):
        fixtures.AdminApiTest.setUp(self)
        with db_conn() as conn:
            conn.execute('TRUNCATE coupons RESTART IDENTITY CASCADE')
            conn.execute("INSERT INTO foods (id,name,current_price) VALUES ('popcorn','ポップコーン',520)")
        self.movie = self.create()
        self.showing_id = self.showing(self.movie).json['id']
        self.seats = self.client.get(f'/api/screenings/{self.showing_id}').json['seats']
        self.user_id = self.customer.get('/api/member/session').json['user']['id']

    def booking_payload(self, seat=0, **changes):
        return {'movie_id': self.movie['id'], 'screening_id': self.showing_id, 'seat_ids': [self.seats[seat]['id']],
                'ticket_count': 1, 'ticket_types': [{'ticket_type_id': 'general', 'quantity': 1}],
                'food_items': [{'food_id': 'popcorn', 'quantity': 1}], 'payment_method': 'credit-card', **changes}

    def book(self, seat=0, **changes):
        fixtures.hold_seats(self.customer, self.showing_id, self.booking_payload(seat)["seat_ids"])
        return self.customer.post('/api/reservations', json=self.booking_payload(seat, **changes), headers=self.customer_headers)

    def coupon(self, **changes):
        response = self.client.post('/api/admin/coupons', json={'code': 'HAL500', 'name': '上映記念',
            'discount_type': 'FIXED', 'discount_value': 500, 'starts_at': None,
            'expires_at': (now_jst()+timedelta(days=7)).isoformat(), 'is_active': True, **changes}, headers=self.headers)
        self.assertEqual(response.status_code, 201, response.json)
        return response.json['coupon']

    def balance(self):
        return self.customer.get('/api/member/points').json

    def cancel(self, order):
        return self.customer.patch(f'/api/reservations/{order}/cancel', json={}, headers=self.customer_headers)

    def counts(self):
        with db_conn() as conn:
            return [conn.execute(f'SELECT count(*) FROM {table}').fetchone()[0] for table in
                    ('orders','reservation_seats','payments','point_transactions','reservation_email_outbox')]

    def test_fixed_coupon_points_and_historical_snapshot(self):
        first = self.book()
        self.assertEqual(first.status_code, 201, first.json)
        self.assertEqual(self.balance()['balance'], 23)
        coupon = self.coupon()
        quote = self.customer.post('/api/reservations/quote', json=self.booking_payload(1, coupon_code=' hal500 ', points_to_use=20,
            total_price=1, ticket_total_price=1), headers=self.customer_headers)
        self.assertEqual(quote.json['total_price'], 1800)
        self.assertEqual(quote.json['points_earned'], 18)
        response = self.book(1, coupon_code='HAL500', points_to_use=20, expected_total=1800, total_price=0)
        self.assertEqual(response.status_code, 201, response.json)
        self.assertEqual(self.balance()['balance'], 21)
        self.client.put(f'/api/admin/coupons/{coupon["id"]}', json={**coupon,'discount_value':900,'code':'CHANGED','is_active':False}, headers=self.headers)
        history = self.customer.get('/api/reservations').json['reservations'][0]
        self.assertEqual([history[k] for k in ('subtotal_amount','coupon_discount_amount','points_used','total_price','points_earned')], [2320,500,20,1800,18])
        self.assertEqual(history['coupon_code'], 'HAL500')
        with db_conn() as conn:
            self.assertEqual(conn.execute('SELECT payment_amount FROM payments WHERE order_id=%s', (response.json['reservation_id'],)).fetchone()[0],1800)

    def test_percentage_rounds_down_and_discount_cannot_make_negative_amount(self):
        self.coupon(discount_type='PERCENT', discount_value=33)
        result = self.book(coupon_code='HAL500')
        self.assertEqual((result.json['coupon_discount_amount'],result.json['total_price'],result.json['points_earned']), (765,1555,15))
        self.coupon(code='FREE',discount_value=10000)
        free = self.book(1,coupon_code='FREE',expected_total=0)
        self.assertEqual(free.status_code,201,free.json)
        self.assertEqual((free.json['total_price'],free.json['points_earned']),(0,0))

    def test_invalid_expired_disabled_and_not_started_coupons_leave_no_reservation(self):
        for index, changes in enumerate(({'is_active':False}, {'expires_at':now_jst().isoformat()},
                                       {'starts_at':(now_jst()+timedelta(days=1)).isoformat()})):
            self.coupon(code=f'BAD{index}', **changes)
        for code in ('UNKNOWN','<script>',False,'X'*41,'BAD0','BAD1','BAD2'):
            with self.subTest(code=code):
                before = self.counts()
                self.assertEqual(self.book(coupon_code=code).status_code,400)
                self.assertEqual(before,self.counts())

    def test_points_validate_integer_balance_and_remaining_charge(self):
        self.book()
        for value in (-1,True,1.5,'2',24,10**12):
            with self.subTest(value=value):
                before = self.counts()
                self.assertIn(self.book(1,points_to_use=value).status_code,(400,409))
                self.assertEqual(before,self.counts())
        self.coupon(discount_value=10000)
        self.assertEqual(self.book(1,coupon_code='HAL500',points_to_use=1).status_code,400)
        self.assertEqual(self.balance()['balance'],23)

    def test_quote_is_read_only_and_price_changes_require_reconfirmation(self):
        before = self.counts()
        result = self.customer.post('/api/reservations/quote', json=self.booking_payload(), headers=self.customer_headers)
        self.assertEqual(result.status_code,200,result.json)
        self.assertEqual(self.counts(),before)

    def test_legacy_points_payment_method_cannot_skip_redemption(self):
        before=self.counts()
        response=self.book(payment_method='points')
        self.assertEqual(response.status_code,400,response.json)
        self.assertEqual(self.counts(),before)
        self.assertEqual(self.book(expected_total=1).json['code'],'price_changed')
        self.assertEqual(self.counts(),before)

    def test_cancel_reverses_and_returns_points_once_and_refunds_final_amount(self):
        self.book()
        self.coupon()
        response = self.book(1,coupon_code='HAL500',points_to_use=20)
        order = response.json['reservation_id']
        cancelled = self.cancel(order)
        self.assertEqual(cancelled.status_code,200,cancelled.json)
        self.assertEqual(cancelled.json['refunded_amount'],1800)
        self.assertEqual(self.balance()['balance'],23)
        kinds = [entry['kind'] for entry in self.balance()['history'] if entry['reservation_id']==order]
        self.assertCountEqual(kinds,['USE','EARN','EARN_REVERSED','USE_RETURNED'])
        before = self.counts()
        self.assertEqual(self.cancel(order).status_code,200)
        self.assertEqual(self.counts(),before)
        self.assertEqual(self.book(1).status_code,201)

    def test_cancellation_of_already_spent_earnings_keeps_debt_and_future_earnings_offset_it(self):
        first = self.book().json['reservation_id']
        self.book(1,points_to_use=23)
        self.assertEqual(self.cancel(first).status_code,200)
        self.assertEqual((self.balance()['balance'],self.balance()['available_points']),(-1,0))
        self.assertEqual(self.book(2,points_to_use=1).status_code,409)
        self.assertEqual(self.book(2).status_code,201)
        self.assertEqual(self.balance()['balance'],22)

    def test_concurrent_spends_are_serialized(self):
        self.book()
        self.coupon(discount_value=2300)
        barrier = threading.Barrier(2)
        def buy(seat):
            client = app.test_client()
            for cookie in self.customer._cookies.values():
                client.set_cookie(cookie.key,cookie.value)
            fixtures.hold_seats(client, self.showing_id, self.booking_payload(seat)["seat_ids"])
            barrier.wait(timeout=10)
            return client.post('/api/reservations',json=self.booking_payload(seat,coupon_code='HAL500',points_to_use=20),headers=self.customer_headers).status_code
        with ThreadPoolExecutor(2) as pool:
            statuses = list(pool.map(buy,[1,2]))
        self.assertCountEqual(statuses,[201,409])
        self.assertEqual(self.balance()['balance'],3)

    def test_mail_enqueue_failure_rolls_back_points_payment_and_seats(self):
        before = self.counts()
        with patch('app.enqueue_reservation_mail',side_effect=RuntimeError('test outbox failure')):
            self.assertEqual(self.book().status_code,503)
        self.assertEqual(before,self.counts())
        self.assertEqual(self.balance()['balance'],0)

    def test_member_identity_csrf_and_admin_authorization(self):
        guest = app.test_client()
        self.assertEqual(guest.get('/api/member/points?user_id=2').status_code,401)
        self.assertEqual(self.book(user_email='staff@example.test').status_code,201)
        self.assertEqual(self.client.get('/api/member/points').status_code,401)
        self.assertEqual(self.customer.get('/api/admin/coupons').status_code,401)
        self.assertEqual(self.client.post('/api/admin/coupons',json={},headers=fixtures.ORIGIN).status_code,403)
        self.assertEqual(self.customer.post('/api/reservations/quote',json=self.booking_payload()).status_code,403)
        self.assertEqual(guest.post('/api/reservations',json=self.booking_payload(1,points_to_use=1)).status_code,401)

    def test_guest_contact_email_does_not_assign_member_points_or_ownership(self):
        guest=app.test_client()
        fixtures.hold_seats(guest, self.showing_id, self.booking_payload()["seat_ids"])
        response=guest.post('/api/reservations',json=self.booking_payload(contact_email='guest@example.test'))
        self.assertEqual(response.status_code,201,response.json)
        self.assertEqual((response.json['points_earned'],response.json['email_status']),(0,'queued'))
        with db_conn() as conn:
            self.assertIsNone(conn.execute('SELECT user_id FROM orders WHERE id=%s',(response.json['reservation_id'],)).fetchone()[0])
        before=self.counts()
        self.assertEqual(guest.post('/api/reservations',json=self.booking_payload(1,contact_email='bad\r\nBcc:someone@example.test')).status_code,400)
        self.assertEqual(before,self.counts())

    def test_outbox_failure_during_cancellation_rolls_back_all_changes(self):
        order=self.book().json['reservation_id']
        before=self.counts()
        with patch('app.enqueue_reservation_mail',side_effect=RuntimeError('test outbox failure')):
            self.assertEqual(self.cancel(order).status_code,503)
        self.assertEqual(before,self.counts())
        self.assertEqual(self.balance()['balance'],23)
        with db_conn() as conn:
            self.assertEqual(conn.execute('SELECT order_status FROM orders WHERE id=%s',(order,)).fetchone()[0],'paid')
            self.assertIsNone(conn.execute('SELECT released_at FROM reservation_seats WHERE order_id=%s',(order,)).fetchone()[0])

    def test_admin_validation_duplicate_edit_and_disable(self):
        for changes in ({'discount_value':True},{'discount_type':'PERCENT','discount_value':101},{'discount_value':0},
                        {'expires_at':'2026-09-18T12:00:00'},{'code':'../a'}):
            base = {'code':'TEST','name':'test','discount_type':'FIXED','discount_value':1,'is_active':True,
                    'expires_at':(now_jst()+timedelta(days=1)).isoformat(),**changes}
            self.assertEqual(self.client.post('/api/admin/coupons',json=base,headers=self.headers).status_code,400)
        coupon = self.coupon()
        self.assertEqual(self.client.post('/api/admin/coupons',json=coupon,headers=self.headers).status_code,409)
        result = self.client.put(f'/api/admin/coupons/{coupon["id"]}',json={**coupon,'is_active':False},headers=self.headers)
        self.assertEqual(result.status_code,200,result.json)
        self.assertFalse(result.json['coupon']['is_active'])
        self.assertEqual(self.client.put(f'/api/admin/coupons/{coupon["id"]}',json=coupon,headers=self.headers).status_code,409)

    def test_point_history_is_paginated_and_scoped_to_user(self):
        self.book()
        self.book(1,points_to_use=2)
        first = self.customer.get('/api/member/points?limit=2').json
        second = self.customer.get(f'/api/member/points?limit=2&before={first["next_cursor"]}').json
        self.assertEqual(len(first['history'])+len(second['history']),3)
        self.assertFalse({row['id'] for row in first['history']} & {row['id'] for row in second['history']})
        self.assertIsNone(second['next_cursor'])

    def test_resend_failure_retry_then_local_http_delivery_and_cancellation_order(self):
        order = self.book().json['reservation_id']
        self.cancel(order)
        with db_conn() as conn:
            snapshots = conn.execute('SELECT recipient,subject,body FROM reservation_email_outbox ORDER BY id').fetchall()
        with ResendStub([(503, {'message': 'private user@example.test re_test_only'})]) as server:
            env = {'MAIL_ENABLED':'true','MAIL_FROM_ADDRESS':'cinema@example.test','RESEND_API_KEY':'re_test_only'}
            with patch.dict(os.environ,env):
                with self.assertLogs('reservation_mail',level='WARNING') as logs:
                    self.assertEqual(deliver_batch()['failed'],1)
                self.assertNotIn('user@example.test',str(logs.output))
                self.assertNotIn('re_test_only',str(logs.output))
                self.assertEqual(deliver_batch()['sent'],0)
                with db_conn() as conn:
                    pending = conn.execute('SELECT status,last_error,next_attempt_at>clock_timestamp() FROM reservation_email_outbox ORDER BY id LIMIT 1').fetchone()
                    self.assertEqual(pending,('pending','ResendHTTP503',True))
                    conn.execute("UPDATE reservation_email_outbox SET next_attempt_at=clock_timestamp()")
                with ThreadPoolExecutor(2) as pool:
                    counts = list(pool.map(lambda _: deliver_batch(),range(2)))
                self.assertEqual(sum(row['sent'] for row in counts),2)
                self.assertEqual(deliver_batch()['sent'],0)
            self.assertEqual(len(server.accepted),2)
            self.assertIn('予約確認',server.accepted[0]['subject'])
            self.assertIn('キャンセル完了',server.accepted[1]['subject'])
            for message, (recipient, subject, body) in zip(server.accepted, snapshots):
                self.assertEqual((message['to'],message['subject'],message['text']),([recipient],subject,body))
                for content in (self.movie['title'],'A-1','2,320円','予約番号','日本時間','ポイント'):
                    self.assertIn(content,body)
                self.assertEqual(message['to'],['user@example.test'])
        self.assertEqual(self.balance()['balance'],0)

    def test_resend_lost_response_retries_without_duplicate_acceptance(self):
        self.book()
        env = {'MAIL_ENABLED':'true','MAIL_FROM_ADDRESS':'cinema@example.test','RESEND_API_KEY':'re_test_only'}
        with ResendStub(disconnect_after_accept=True) as server, patch.dict(os.environ,env):
            with self.assertLogs('reservation_mail',level='WARNING'):
                self.assertEqual(deliver_batch()['failed'],1)
            with db_conn() as conn:
                self.assertEqual(conn.execute('SELECT status FROM reservation_email_outbox').fetchone()[0],'pending')
                conn.execute('UPDATE reservation_email_outbox SET next_attempt_at=clock_timestamp()')
            self.assertEqual(deliver_batch()['sent'],1)
            self.assertEqual(deliver_batch()['sent'],0)
            self.assertEqual(len(server.requests),2)
            self.assertEqual(len(server.accepted),1)
            self.assertEqual(server.requests[0]['headers']['Idempotency-Key'],server.requests[1]['headers']['Idempotency-Key'])
        with db_conn() as conn:
            self.assertEqual(conn.execute('SELECT status,attempts,last_error FROM reservation_email_outbox').fetchone(),('sent',2,None))

    def test_resend_timeout_keeps_booking_and_retries_at_existing_interval(self):
        order = self.book().json['reservation_id']
        before = self.counts()
        env = {'MAIL_ENABLED':'true','MAIL_FROM_ADDRESS':'cinema@example.test','RESEND_API_KEY':'re_test_only'}
        with patch.dict(os.environ,env), patch('reservation_mail.HTTPSConnection') as connection:
            connection.return_value.getresponse.side_effect = TimeoutError('test only')
            with self.assertLogs('reservation_mail',level='WARNING'):
                self.assertEqual(deliver_batch()['failed'],1)
        self.assertEqual(self.counts(),before)
        self.assertEqual(self.balance()['balance'],23)
        with db_conn() as conn:
            self.assertEqual(conn.execute('SELECT order_status FROM orders WHERE id=%s',(order,)).fetchone()[0],'paid')
            self.assertIsNone(conn.execute('SELECT released_at FROM reservation_seats WHERE order_id=%s',(order,)).fetchone()[0])
            state = conn.execute("SELECT status,last_error,EXTRACT(EPOCH FROM next_attempt_at-clock_timestamp()) FROM reservation_email_outbox").fetchone()
            self.assertEqual(state[:2],('pending','TimeoutError'))
            self.assertGreater(state[2],20)
            self.assertLessEqual(state[2],30)

    def test_migration_preserves_legacy_totals_and_is_repeatable(self):
        order = self.book().json['reservation_id']
        with db_conn() as conn:
            conn.execute('DROP TABLE reservation_email_outbox,point_transactions,point_accounts')
            conn.execute('ALTER TABLE orders DROP CONSTRAINT chk_order_discount_snapshot')
            for column in ('subtotal_amount','coupon_id','coupon_code','coupon_discount_amount','points_used','points_earned'):
                conn.execute(f'ALTER TABLE orders DROP COLUMN {column}')
            conn.execute('DROP TABLE coupons')
            migration = Path('database/booking_benefits_migration.sql').read_text()
            conn.execute(migration)
            conn.execute(migration)
            row = conn.execute('SELECT total_amount,subtotal_amount,points_used,points_earned FROM orders WHERE id=%s',(order,)).fetchone()
            self.assertEqual(row,(2320,2320,0,0))
            self.assertEqual(conn.execute('SELECT count(*) FROM reservation_email_outbox').fetchone()[0],0)
            self.assertEqual(conn.execute('SELECT count(*) FROM reservation_seats WHERE order_id=%s',(order,)).fetchone()[0],1)

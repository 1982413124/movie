"""Admin coupon management and authenticated member point history."""
from datetime import datetime

from flask import Blueprint, g, jsonify, request
from psycopg import errors
from psycopg.rows import dict_row

from admin_auth import admin_required
from member_auth import member_required
from database.db import db_conn
from booking_benefits import BenefitError, coupon_code, integer, point_balance, POINT_EARN_YEN, POINT_VALUE_YEN

benefits = Blueprint('booking_benefits', __name__, url_prefix='/api')


@benefits.after_request
def private_response(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


def serialize_coupon(row):
    return {key: value.isoformat() if isinstance(value, datetime) else value for key, value in row.items()}


def coupon_input(payload):
    if not isinstance(payload, dict):
        raise BenefitError('クーポン情報を入力してください。')
    code = coupon_code(payload.get('code'))
    name = payload.get('name')
    kind = payload.get('discount_type')
    value = integer(payload.get('discount_value'), '割引額・割引率')
    if not code or not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
        raise BenefitError('クーポンコードと100文字以内の名称を入力してください。')
    if kind not in ('FIXED', 'PERCENT') or value <= 0 or (kind == 'PERCENT' and value > 100):
        raise BenefitError('固定額は1円以上、割合は1〜100%で指定してください。')
    if not isinstance(payload.get('is_active'), bool):
        raise BenefitError('利用可否を指定してください。')
    dates = []
    for field in ('starts_at', 'expires_at'):
        raw = payload.get(field)
        if not raw and field == 'starts_at':
            dates.append(None)
            continue
        try:
            stamp = datetime.fromisoformat(raw.replace('Z', '+00:00'))
            if stamp.tzinfo is None:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise BenefitError('開始日時・有効期限を正しい日時で指定してください。') from None
        dates.append(stamp)
    if dates[0] and dates[1] <= dates[0]:
        raise BenefitError('有効期限は利用開始日時より後にしてください。')
    return (code, name.strip(), kind, value, *dates, payload['is_active'])


@benefits.get('/admin/coupons')
@admin_required
def list_coupons():
    with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute('SELECT * FROM coupons ORDER BY created_at DESC, id DESC')
        rows = [serialize_coupon(row) for row in cur.fetchall()]
    return jsonify({'coupons': rows})


@benefits.post('/admin/coupons')
@admin_required
def create_coupon():
    try:
        values = coupon_input(request.get_json(silent=True))
        with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('''INSERT INTO coupons (code, name, discount_type, discount_value, starts_at, expires_at, is_active)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *''', values)
            row = serialize_coupon(cur.fetchone())
        return jsonify({'coupon': row, 'message': 'クーポンを作成しました。'}), 201
    except BenefitError as exc:
        return jsonify({'message': str(exc)}), exc.status
    except errors.UniqueViolation:
        return jsonify({'message': 'このクーポンコードは登録済みです。'}), 409


@benefits.put('/admin/coupons/<int:coupon_id>')
@admin_required
def update_coupon(coupon_id):
    payload = request.get_json(silent=True)
    try:
        values = coupon_input(payload)
        with db_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute('SELECT * FROM coupons WHERE id = %s FOR UPDATE', (coupon_id,))
            current = cur.fetchone()
            if not current:
                return jsonify({'message': 'クーポンが見つかりません。'}), 404
            if payload.get('updated_at') != current['updated_at'].isoformat():
                return jsonify({'message': '別の操作で更新されています。一覧を更新してから編集してください。'}), 409
            cur.execute('''UPDATE coupons SET code=%s, name=%s, discount_type=%s, discount_value=%s,
                starts_at=%s, expires_at=%s, is_active=%s, updated_at=clock_timestamp() WHERE id=%s RETURNING *''', (*values, coupon_id))
            row = serialize_coupon(cur.fetchone())
        return jsonify({'coupon': row, 'message': 'クーポンを更新しました。'})
    except BenefitError as exc:
        return jsonify({'message': str(exc)}), exc.status
    except errors.UniqueViolation:
        return jsonify({'message': 'このクーポンコードは登録済みです。'}), 409


@benefits.get('/member/points')
@member_required
def member_points():
    try:
        limit = max(1, min(50, int(request.args.get('limit', 20))))
        before = int(request.args.get('before', 0))
        if before < 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({'message': '履歴の取得条件を確認してください。'}), 400
    try:
        with db_conn() as conn, conn.cursor() as cur:
            # Balance and entries are from one consistent snapshot even while another tab books.
            cur.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
            balance = point_balance(cur, g.member['id'])
            cur.execute('''SELECT p.id,p.order_id,p.kind,p.amount,p.balance_after,p.created_at,o.order_num,
                (SELECT movie_title_at_purchase FROM reservation_seats WHERE order_id=o.id ORDER BY id LIMIT 1)
                FROM point_transactions p JOIN orders o ON o.id=p.order_id
                WHERE p.user_id=%s AND (%s=0 OR p.id<%s) ORDER BY p.id DESC LIMIT %s''', (g.member['id'], before, before, limit + 1))
            rows = cur.fetchall()
        entries = [dict(zip(('id','reservation_id','kind','amount','balance_after','created_at','order_num','movie_title'),
                           (*row[:5], row[5].isoformat(), *row[6:]))) for row in rows[:limit]]
        return jsonify({'balance': balance, 'available_points': max(0, balance), 'history': entries,
                        'next_cursor': rows[limit - 1][0] if len(rows) > limit else None,
                        'point_earn_yen': POINT_EARN_YEN, 'point_value_yen': POINT_VALUE_YEN})
    except Exception:
        from flask import current_app
        current_app.logger.exception('Point history lookup failed')
        return jsonify({'message': 'ポイント履歴を取得できませんでした。'}), 503

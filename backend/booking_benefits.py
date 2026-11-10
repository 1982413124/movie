"""Authoritative yen pricing and a transactional member point ledger."""
import re

POINT_EARN_YEN = 100
POINT_VALUE_YEN = 1
MAX_AMOUNT = 1_000_000_000


class BenefitError(ValueError):
    def __init__(self, message, code='invalid_discount', status=400):
        super().__init__(message)
        self.code = code
        self.status = status


def coupon_code(value):
    if value is None or value == '':
        return ''
    if not isinstance(value, str):
        raise BenefitError('クーポンコードを確認してください。', 'invalid_coupon')
    code = value.strip().upper()
    if code and not re.fullmatch(r'[A-Z0-9][A-Z0-9_-]{2,39}', code):
        raise BenefitError('クーポンコードは3〜40文字の半角英数字・ハイフン・アンダースコアで入力してください。', 'invalid_coupon')
    return code


def integer(value, label, maximum=MAX_AMOUNT):
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= maximum:
        raise BenefitError(f'{label}は0〜{maximum:,}の整数で指定してください。')
    return value


def point_balance(cur, user_id, *, lock=False):
    if user_id is None:
        return 0
    if lock:
        cur.execute('INSERT INTO point_accounts (user_id) VALUES (%s) ON CONFLICT DO NOTHING', (user_id,))
    cur.execute('SELECT balance FROM point_accounts WHERE user_id = %s' + (' FOR UPDATE' if lock else ''), (user_id,))
    row = cur.fetchone()
    return row[0] if row else 0


def price_purchase(cur, subtotal, user_id, payload, *, lock=False):
    subtotal = integer(subtotal, '合計金額')
    code = coupon_code(payload.get('coupon_code', ''))
    points = integer(payload.get('points_to_use', 0), '利用ポイント')
    discount, selected_id = 0, None
    if code:
        cur.execute('''SELECT id, discount_type, discount_value, is_active,
            (starts_at IS NULL OR starts_at <= clock_timestamp()), expires_at > clock_timestamp()
            FROM coupons WHERE code = %s''' + (' FOR SHARE' if lock else ''), (code,))
        coupon = cur.fetchone()
        if not coupon:
            raise BenefitError('クーポンコードが見つかりません。', 'invalid_coupon')
        if not coupon[3]:
            raise BenefitError('このクーポンは無効になっています。', 'inactive_coupon')
        if not coupon[4]:
            raise BenefitError('このクーポンはまだ利用できません。', 'early_coupon')
        if not coupon[5]:
            raise BenefitError('このクーポンは有効期限を過ぎています。', 'expired_coupon')
        selected_id = coupon[0]
        discount = min(subtotal, coupon[2] if coupon[1] == 'FIXED' else subtotal * coupon[2] // 100)
    balance = point_balance(cur, user_id, lock=lock)
    if points and user_id is None:
        raise BenefitError('ポイントを使うにはログインしてください。', 'member_required', 401)
    if points > max(0, balance):
        raise BenefitError('ポイント残高が不足しています。残高を確認して再度お試しください。', 'insufficient_points', 409)
    if points > subtotal - discount:
        raise BenefitError('利用ポイントはクーポン適用後の金額以内で指定してください。', 'excess_points')
    final = subtotal - discount - points
    return {'subtotal_amount': subtotal, 'coupon_id': selected_id, 'coupon_code': code or None,
            'coupon_discount_amount': discount, 'points_used': points, 'total_price': final,
            'points_earned': final // POINT_EARN_YEN if user_id is not None else 0,
            'point_balance': balance, 'available_points': max(0, balance),
            'point_earn_yen': POINT_EARN_YEN, 'point_value_yen': POINT_VALUE_YEN}


def add_point_entry(cur, user_id, order_id, kind, amount, balance):
    if not amount:
        return balance
    balance += amount
    cur.execute('''INSERT INTO point_transactions (user_id, order_id, kind, amount, balance_after)
        VALUES (%s, %s, %s, %s, %s)''', (user_id, order_id, kind, amount, balance))
    cur.execute('UPDATE point_accounts SET balance = %s, updated_at = clock_timestamp() WHERE user_id = %s', (balance, user_id))
    return balance


def apply_points(cur, user_id, order_id, pricing):
    if user_id is None:
        return 0
    # price_purchase already locked this account before validating its spendable balance.
    balance = add_point_entry(cur, user_id, order_id, 'USE', -pricing['points_used'], pricing['point_balance'])
    return add_point_entry(cur, user_id, order_id, 'EARN', pricing['points_earned'], balance)


def reverse_points(cur, user_id, order_id):
    # Caller holds the order lock and only calls this on the first successful cancellation.
    cur.execute('SELECT points_used, points_earned FROM orders WHERE id = %s', (order_id,))
    used, earned = cur.fetchone()
    if not used and not earned:
        return point_balance(cur, user_id)
    balance = point_balance(cur, user_id, lock=True)
    balance = add_point_entry(cur, user_id, order_id, 'EARN_REVERSED', -earned, balance)
    return add_point_entry(cur, user_id, order_id, 'USE_RETURNED', used, balance)

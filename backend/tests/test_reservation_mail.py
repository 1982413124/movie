"""Resend HTTP contract and configuration tests without external delivery."""
import json
import os
import ssl
import unittest
from unittest.mock import patch

from reservation_mail import ResendAPIError, deliver_batch, resend_settings, send_message
from resend_stub import ResendStub


class ReservationMailTest(unittest.TestCase):
    def setUp(self):
        self.settings = {'sender': 'cinema@example.test', 'api_key': 're_test_only'}
        self.subject = 'HAL CINEMA｜予約確認 TEST-123'
        self.body = 'HAL CINEMA\n\nご予約を承りました。\n座席 A-1\n最終支払額：2,320円'

    def send(self, outbox_id=1, recipient='user@example.test'):
        return send_message(self.settings, outbox_id, recipient, self.subject, self.body)

    def test_disabled_mail_needs_no_credentials_and_does_not_read_queue(self):
        with patch.dict(os.environ, {}, clear=True), patch('reservation_mail.db_conn') as db:
            self.assertIsNone(resend_settings())
            self.assertEqual(deliver_batch(), {'sent': 0, 'failed': 0, 'enabled': False})
            db.assert_not_called()

    def test_resend_configuration_uses_server_key_without_smtp(self):
        with patch.dict(os.environ, {'MAIL_ENABLED': 'true', 'MAIL_FROM_ADDRESS': 'cinema@example.test',
                                    'RESEND_API_KEY': ' re_test_only '}, clear=True):
            self.assertEqual(resend_settings(), self.settings)

    def test_missing_key_does_not_fall_back_to_smtp(self):
        for key in ('', '  ', 're_test\r\nInjected: value', '日本語'):
            with self.subTest(key=bool(key)), patch.dict(os.environ, {'MAIL_ENABLED': 'true',
                    'MAIL_FROM_ADDRESS': 'cinema@example.test', 'RESEND_API_KEY': key,
                    'SMTP_HOST': 'unused.example.test', 'SMTP_USERNAME': 'old-user', 'SMTP_PASSWORD': 'old-password'}, clear=True):
                with self.assertRaises(ValueError), patch('reservation_mail.db_conn') as db:
                    deliver_batch()
                db.assert_not_called()

    def test_request_preserves_plain_text_subject_recipient_and_message_id(self):
        with ResendStub() as stub:
            self.assertEqual(self.send(), 'stub-email-1')
            request = stub.requests[0]
            self.assertEqual(request['path'], '/emails')
            self.assertEqual(request['headers']['Authorization'], 'Bearer re_test_only')
            self.assertEqual(request['headers']['Content-Type'], 'application/json')
            self.assertEqual(request['payload'], {'from': 'cinema@example.test', 'to': ['user@example.test'],
                'subject': self.subject, 'text': self.body,
                'headers': {'Message-ID': '<hal-reservation-1@example.test>'}})
            self.assertEqual(stub.connection.call_args.args, ('api.resend.com',))
            options = stub.connection.call_args.kwargs
            self.assertEqual(options['timeout'], 10)
            self.assertEqual(options['context'].verify_mode, ssl.CERT_REQUIRED)
            self.assertTrue(options['context'].check_hostname)

    def test_retries_have_same_key_and_different_messages_have_different_keys(self):
        with ResendStub() as stub:
            self.assertEqual(self.send(), self.send())
            self.send(2)
            self.send(recipient='other@example.test')
            keys = [request['headers']['Idempotency-Key'] for request in stub.requests]
            self.assertEqual(keys[0], keys[1])
            self.assertEqual(len(set(keys)), 3)
            self.assertEqual(len(stub.accepted), 3)
            self.assertLessEqual(len(keys[0]), 256)
            self.assertNotIn('user@example.test', keys[0])

    def test_http_errors_and_redirects_are_not_accepted_or_followed(self):
        statuses = (301, 400, 401, 403, 409, 422, 429, 500, 503)
        with ResendStub([(status, {'message': 'private user@example.test re_test_only'}) for status in statuses]) as stub:
            for status in statuses:
                with self.subTest(status=status), self.assertRaises(ResendAPIError) as raised:
                    self.send()
                self.assertEqual(raised.exception.status, status)
                self.assertNotIn('private', str(raised.exception))
                self.assertNotIn('re_test_only', str(raised.exception))
            self.assertEqual(len(stub.requests), len(statuses))
            self.assertEqual(stub.accepted, [])

    def test_success_response_requires_an_email_id(self):
        for response in (b'not-json', {}, {'id': ''}, {'id': None}, []):
            with self.subTest(response=response), ResendStub([(200, response)]):
                with self.assertRaises((ValueError, json.JSONDecodeError)):
                    self.send()

    def test_timeout_closes_connection_and_propagates_to_retry_queue(self):
        with patch('reservation_mail.HTTPSConnection') as connection:
            connection.return_value.getresponse.side_effect = TimeoutError('test only')
            with self.assertRaises(TimeoutError):
                self.send()
            connection.return_value.close.assert_called_once()

    def test_invalid_recipient_never_reaches_provider(self):
        with patch('reservation_mail.HTTPSConnection') as connection:
            with self.assertRaises(ValueError):
                self.send(recipient='invalid\r\nBcc:other@example.test')
            connection.assert_not_called()

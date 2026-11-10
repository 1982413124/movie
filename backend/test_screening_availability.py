import unittest
from unittest.mock import MagicMock, patch

import app as app_module


class ScreeningAvailabilityTest(unittest.TestCase):
    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def test_batch_retains_empty_screenings_and_uses_one_active_seat_query(self):
        connection = MagicMock()
        cursor = connection.__enter__.return_value.cursor.return_value.__enter__.return_value
        cursor.fetchall.return_value = [("show-a", "A-1"), ("show-b", "B-2")]
        with patch.object(app_module, "db_conn", return_value=connection):
            response = self.client.get("/api/screenings/availability?ids=show-a,show-b,show-c,show-a")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["reserved_seats_by_screening"], {
            "show-a": ["A-1"], "show-b": ["B-2"], "show-c": [],
        })
        cursor.execute.assert_called_once()
        sql, params = cursor.execute.call_args.args
        self.assertIn("rs.released_at IS NULL", sql)
        self.assertIn("o.order_status IN ('pending', 'paid')", sql)
        self.assertIn("h.expires_at > clock_timestamp()", sql)
        self.assertEqual(params, (["show-a", "show-b", "show-c"], ["show-a", "show-b", "show-c"]))

    def test_invalid_batches_are_rejected_without_querying(self):
        with patch.object(app_module, "db_conn") as connect:
            self.assertEqual(self.client.get("/api/screenings/availability").status_code, 400)
            ids = ",".join("show-" + str(index) for index in range(65))
            self.assertEqual(self.client.get("/api/screenings/availability?ids=" + ids).status_code, 400)
            connect.assert_not_called()

    def test_database_failure_is_not_reported_as_full_availability(self):
        with patch.object(app_module, "db_conn", side_effect=RuntimeError("private DB details")):
            response = self.client.get("/api/screenings/availability?ids=show-a")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private DB details", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()

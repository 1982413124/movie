import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reservation_service import find_conflicting_seats, normalize_seat_ids, normalize_seat_label


class ReservationServiceTests(unittest.TestCase):
    def test_normalize_seat_ids_strips_invalid_values(self):
        normalized = normalize_seat_ids(["A-1", "", "B-2", None, 3])
        self.assertEqual(normalized, ["A-1", "B-2", "3"])

    def test_normalize_seat_label_supports_plain_number_format(self):
        self.assertEqual(normalize_seat_label("A1"), "A-1")
        self.assertEqual(normalize_seat_label("a-1"), "A-1")
        self.assertEqual(normalize_seat_label("C03"), "C-3")

    def test_find_conflicting_seats_returns_intersection(self):
        reserved = {"A-1", "A-2", "B-3"}
        selected = ["A-2", "C-4", "B-3"]

        self.assertEqual(find_conflicting_seats(reserved, selected), ["A-2", "B-3"])


if __name__ == "__main__":
    unittest.main()

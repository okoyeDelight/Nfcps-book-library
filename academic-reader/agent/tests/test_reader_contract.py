"""Cheap local feature-contract checks for the mirrored Academic Reader source.

These are intentionally *static* smoke checks. They are NOT real app, API,
document-fidelity, accessibility, or mobile browser tests.
"""
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
READER = ROOT / "frontend" / "NfcpsAcademicBookReader.jsx"
CSS = ROOT / "frontend" / "academic-reader.css"


class AcademicReaderSourceContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = READER.read_text(encoding="utf-8")
        cls.styles = CSS.read_text(encoding="utf-8")

    def test_reader_component_exists(self):
        self.assertIn("function NfcpsAcademicBookReader(", self.source)

    def test_manifest_and_page_count_are_explicit(self):
        self.assertIn("mode=manifest", self.source)
        self.assertIn("sourceCount", self.source)
        self.assertIn(" of "+'"+sourceCount', self.source)

    def test_slide_grouping_controls_exist(self):
        self.assertIn("twoUp", self.source)
        self.assertIn("1 page", self.source)
        self.assertIn("2 slides", self.source)

    def test_study_tools_remain_available(self):
        for marker in ["understand", "ask", "exam", "recall"]:
            with self.subTest(marker=marker):
                self.assertIn('"'+marker+'"', self.source)

    def test_actual_and_predicted_questions_remain_distinct(self):
        self.assertIn("Actual past questions", self.source)
        self.assertIn("Likely questions", self.source)

    def test_nfcps_reader_styling_remains_present(self):
        self.assertIn(".academic-book-reader", self.styles)


if __name__ == "__main__":
    unittest.main()

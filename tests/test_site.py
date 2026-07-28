import json
from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.local_assets: set[str] = set()
        self.module_scripts: set[str] = set()

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids.add(element_id)

        reference = None
        if tag == "script":
            reference = attributes.get("src")
            if attributes.get("type") == "module" and reference:
                self.module_scripts.add(reference)
        elif tag == "link":
            reference = attributes.get("href")

        if (
            reference
            and not reference.startswith(("#", "data:", "http:", "https:"))
        ):
            self.local_assets.add(reference)


class StaticSiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.parser = SiteParser()
        cls.parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))

    def test_local_assets_exist(self) -> None:
        missing = [
            asset
            for asset in self.parser.local_assets
            if not (ROOT / asset).is_file()
        ]
        self.assertEqual(missing, [])

    def test_interaction_hooks_exist(self) -> None:
        required = {
            "credits",
            "game-message",
            "hold-button",
            "multiplier",
            "round-state",
            "signal-track",
            "stake",
        }
        self.assertEqual(required - self.parser.ids, set())

    def test_browser_controller_is_an_es_module(self) -> None:
        self.assertIn("script.js", self.parser.module_scripts)

    def test_manifest_is_valid_and_local(self) -> None:
        manifest = json.loads(
            (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["start_url"], "./")
        self.assertEqual(manifest["display"], "standalone")
        for icon in manifest["icons"]:
            self.assertTrue((ROOT / icon["src"]).is_file())


if __name__ == "__main__":
    unittest.main()

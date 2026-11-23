"""The backend and this service must agree on resource and scenario names.

An unknown resource gets generic advice instead of real recommendations, and a
food type the backend doesn't know is never suggested to the inventory form. A
rename on either side would quietly degrade the app, so these tests read the
backend's config and fail on drift instead.
"""
import re
from pathlib import Path

import pytest

from app.food import FOOD_RESOURCE_TYPES
from app.ranker import RESOURCE_CATEGORIES, SCENARIOS

BACKEND_CONFIG = Path(__file__).resolve().parents[2] / "backend" / "src" / "config"


def top_level_keys(filename):
    path = BACKEND_CONFIG / filename
    if not path.exists():
        pytest.skip(f"{path} not found (running outside the full repo)")
    # Top-level entries in these files are written as "  key: {".
    return set(re.findall(r"^  (\w+): \{", path.read_text(), flags=re.MULTILINE))


def test_every_backend_resource_has_ranker_categories():
    assert top_level_keys("requirements.js") == set(RESOURCE_CATEGORIES)


def test_every_backend_scenario_is_known_to_the_ranker():
    assert top_level_keys("scenarios.js") == SCENARIOS

def test_every_food_type_is_an_inventory_resource_type():
    assert FOOD_RESOURCE_TYPES <= top_level_keys("resourceTypes.js")

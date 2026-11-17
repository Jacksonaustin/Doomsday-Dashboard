"""Measure how well the ranker picks advice for labeled shortages.

Run from the ml-recommend folder:
    python -m eval.run_eval
    python -m eval.run_eval --method tfidf --show-misses
    python -m eval.run_eval --ignore-scenario   # rank as if the scenario key wasn't sent
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path
from app.ranker import RESOURCE_CATEGORIES, SCENARIOS, THRESHOLDS, Ranker, load_catalog

LABELED_PATH = Path(__file__).parent / "labeled.json"


def load_cases(path, catalog):
    """Load labeled.json and stop early if a label can never be right."""
    category_of = {item["id"]: item["category"] for item in catalog}
    cases = json.loads(Path(path).read_text())
    problems = []

    for number, case in enumerate(cases, start=1):
        resource = case.get("resource")
        if resource not in RESOURCE_CATEGORIES:
            problems.append(f"case {number}: unknown resource {resource!r}")
            continue
        if case.get("scenario") not in SCENARIOS:
            problems.append(f"case {number}: unknown scenario {case.get('scenario')!r}")
            continue
        if not case.get("description") or not case.get("good"):
            problems.append(f"case {number}: needs a description and at least one good id")
            continue
        for item_id in case["good"]:
            if item_id not in category_of:
                problems.append(f"case {number}: {item_id!r} is not in catalog.json")
            elif category_of[item_id] not in RESOURCE_CATEGORIES[resource]:
                # The category filter removes it, so the ranker can never return it.
                problems.append(
                    f"case {number}: {item_id!r} is in category {category_of[item_id]!r}, "
                    f"which {resource} never searches"
                )

    if problems:
        raise SystemExit("Fix labeled.json first:\n  " + "\n  ".join(problems))
    return cases


def best_scores(ranker, case):
    """Best score among the right answers, and among the wrong ones (same categories)."""
    allowed = RESOURCE_CATEGORIES[case["resource"]]
    good = set(case["good"])
    right, wrong = [], []

    for score, item in zip(ranker._scores(case["description"]), ranker.catalog):
        if item["category"] in allowed:
            (right if item["id"] in good else wrong).append(score)

    return max(right), (max(wrong) if wrong else None)


def evaluate(ranker, cases, top_k, use_scenario=True):
    tags = {item["id"]: set(item.get("scenarios", [])) for item in ranker.catalog}
    rows = []
    for case in cases:
        scenario = case["scenario"] if use_scenario else None
        result = ranker.rank(case["description"], resource=case["resource"], top_k=top_k, scenario=scenario)
        returned = [r["id"] for r in result["recommendations"]] if result["matched"] else []
        returned_tags = [tags.get(item_id, set()) for item_id in returned]
        good = set(case["good"])
        position = next((i + 1 for i, item_id in enumerate(returned) if item_id in good), None)
        best_right, best_wrong = best_scores(ranker, case)

        rows.append({
            "case": case,
            "returned": returned,
            "top1": position == 1,
            "hit": position is not None,
            "reciprocal_rank": 1 / position if position else 0.0,
            "low_confidence": result["lowConfidence"],
            "best_right": best_right,
            "best_wrong": best_wrong,
            # Advice written for this disaster, and advice written only for a different one.
            "has_scenario_advice": any(case["scenario"] in t for t in returned_tags),
            "has_other_scenario_advice": any(t and case["scenario"] not in t for t in returned_tags),
        })
    return rows


def percent(count, total):
    return f"{100 * count / total:.1f}%" if total else "n/a"


def report(method, rows, top_k, show_misses):
    total = len(rows)
    top1 = sum(r["top1"] for r in rows)
    hits = sum(r["hit"] for r in rows)
    mrr = sum(r["reciprocal_rank"] for r in rows) / total
    thresholds = THRESHOLDS[method]

    print(f"\n=== {method} ({total} cases) ===")
    print(f"  Top-1 accuracy   {percent(top1, total)}  ({top1}/{total})")
    print(f"  Hit@{top_k}            {percent(hits, total)}  ({hits}/{total})")
    print(f"  MRR              {mrr:.3f}")

    # Confident and wrong is the worst case: the user sees bad advice with no warning.
    confident_wrong = sum(not r["top1"] and not r["low_confidence"] for r in rows)
    flagged_right = sum(r["top1"] and r["low_confidence"] for r in rows)
    print(f"  Confident but wrong       {confident_wrong}")
    print(f"  Right but flagged low     {flagged_right}")

    print("\n  By resource:")
    by_resource = defaultdict(list)
    for r in rows:
        by_resource[r["case"]["resource"]].append(r)
    for resource, group in sorted(by_resource.items()):
        n = len(group)
        print(f"    {resource:<18} top-1 {percent(sum(r['top1'] for r in group), n):>6}"
              f"   hit@{top_k} {percent(sum(r['hit'] for r in group), n):>6}   ({n} cases)")
    print("\n  By scenario:")
    by_scenario = defaultdict(list)
    for r in rows:
        by_scenario[r["case"]["scenario"]].append(r)
    for scenario, group in sorted(by_scenario.items()):
        n = len(group)
        print(f"    {scenario:<18} top-1 {percent(sum(r['top1'] for r in group), n):>6}"
              f"   hit@{top_k} {percent(sum(r['hit'] for r in group), n):>6}   ({n} cases)")

    # Not every case has scenario advice in the catalog (pets, infants, medication),
    # so these won't reach 100%. What matters is how they move when the ranker changes.
    with_scenario = sum(r["has_scenario_advice"] for r in rows)
    with_other = sum(r["has_other_scenario_advice"] for r in rows)
    print(f"\n  Scenario advice in top {top_k}:        {percent(with_scenario, total)}  ({with_scenario}/{total})")
    print(f"  Wrong-scenario advice in top {top_k}:  {percent(with_other, total)}  ({with_other}/{total})")

    # These numbers are for picking thresholds: right answers should score above
    # low_confidence, and wrong ones below it.
    right_scores = [r["best_right"] for r in rows]
    wrong_scores = [r["best_wrong"] for r in rows if r["best_wrong"] is not None]
    print(f"\n  Scores (low_confidence={thresholds['low_confidence']}, "
          f"no_match={thresholds['no_match']}):")
    print(f"    best right answer   min {min(right_scores):.3f}   "
          f"avg {sum(right_scores) / len(right_scores):.3f}")
    if wrong_scores:
        print(f"    best wrong answer   max {max(wrong_scores):.3f}   "
              f"avg {sum(wrong_scores) / len(wrong_scores):.3f}")
    print(f"    right answers below low_confidence: "
          f"{sum(s < thresholds['low_confidence'] for s in right_scores)}")

    misses = [r for r in rows if not r["top1"]]
    if show_misses and misses:
        print("\n  Misses:")
        for r in misses:
            case = r["case"]
            print(f"    [{case['resource']}] {case['description']}")
            print(f"      expected one of: {', '.join(case['good'])}")
            print(f"      got:             {', '.join(r['returned']) or '(generic advice)'}")

    return {"method": method, "top1": top1 / total, "hit": hits / total, "mrr": mrr}


def main():
    parser = argparse.ArgumentParser(description="Evaluate the recommendation ranker.")
    parser.add_argument("--file", default=LABELED_PATH, help="labeled cases (JSON)")
    parser.add_argument("--method", choices=["semantic", "tfidf", "both"], default="both")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--show-misses", action="store_true")
    parser.add_argument("--ignore-scenario", action="store_true",
                        help="don't pass each case's scenario to the ranker (for comparison)")
    args = parser.parse_args()

    catalog = load_catalog()
    cases = load_cases(args.file, catalog)
    methods = ["semantic", "tfidf"] if args.method == "both" else [args.method]

    for method in methods:
        ranker = Ranker(catalog=catalog, use_model=(method == "semantic"))
        if ranker.method != method:
            print(f"\nSkipping {method}: the model did not load (got {ranker.method}).")
            continue
        
        rows = evaluate(ranker, cases, args.top_k, use_scenario=not args.ignore_scenario)
        report(method, rows, args.top_k, args.show_misses)


if __name__ == "__main__":
    main()
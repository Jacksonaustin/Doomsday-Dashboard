"""Measure how well the food classifier recognizes what people type.

Run from the ml-recommend folder:
    python -m eval.run_food_eval
    python -m eval.run_food_eval --method tfidf --show-misses
    python -m eval.run_food_eval --sweep   # try confidence thresholds
"""
import argparse
import json
from pathlib import Path

import app.food as food
from app.food import FOOD_RESOURCE_TYPES, FoodClassifier, load_food_catalog, parse_text

LABELED_PATH = Path(__file__).parent / "food_labeled.json"
FIELDS = ["resourceType", "perishable", "needsCooking"]


def load_cases(path):
    cases = json.loads(Path(path).read_text())
    for number, case in enumerate(cases, start=1):
        if case["resourceType"] is not None and case["resourceType"] not in FOOD_RESOURCE_TYPES:
            raise SystemExit(f"case {number}: unknown resourceType {case['resourceType']!r}")
    return cases


def load_model():
    from sentence_transformers import SentenceTransformer

    from app.ranker import MODEL_NAME

    return SentenceTransformer(MODEL_NAME)


def percent(count, total):
    return f"{100 * count / total:.1f}%" if total else "n/a"


def evaluate(classifier, cases):
    rows = []
    for case in cases:
        result = classifier.classify(case["text"])
        is_food = case["resourceType"] is not None
        wrong = [f for f in FIELDS if is_food and result["matched"] and result[f] != case[f]]
        rows.append({"case": case, "result": result, "is_food": is_food, "wrong": wrong})
    return rows


def report(method, rows, show_misses):
    food_rows = [r for r in rows if r["is_food"]]
    other_rows = [r for r in rows if not r["is_food"]]
    guessed = [r for r in food_rows if r["result"]["matched"]]
    all_right = [r for r in guessed if not r["wrong"]]
    # The worst case: a non-food item, or a wrong answer, shown as a confident guess.
    confident_wrong = [r for r in guessed if r["wrong"]] + [r for r in other_rows if r["result"]["matched"]]

    print(f"\n=== {method} ({len(food_rows)} food, {len(other_rows)} non-food) ===")
    print(f"  Food items guessed          {percent(len(guessed), len(food_rows))}  ({len(guessed)}/{len(food_rows)})")
    print(f"  Guesses fully right         {percent(len(all_right), len(guessed))}  ({len(all_right)}/{len(guessed)})")
    for field in FIELDS:
        right = sum(field not in r["wrong"] for r in guessed)
        print(f"    {field:<26}{percent(right, len(guessed))}")
    rejected = sum(not r["result"]["matched"] for r in other_rows)
    print(f"  Non-food correctly ignored  {percent(rejected, len(other_rows))}  ({rejected}/{len(other_rows)})")
    print(f"  Confident but wrong         {len(confident_wrong)}")

    with_count = [r for r in rows if r["is_food"]]
    parsed = sum(parse_text(r["case"]["text"])[0] == r["case"]["quantity"] for r in with_count)
    print(f"  Count read correctly        {percent(parsed, len(with_count))}  ({parsed}/{len(with_count)})")

    def score(r):
        return r["result"]["confidence"] or 0.0

    right_scores = sorted(score(r) for r in rows if r["is_food"] and r["result"]["matched"] and not r["wrong"])
    other_scores = sorted(score(r) for r in other_rows)
    print(f"\n  Scores (threshold {food.MIN_CONFIDENCE[method]}):")
    if right_scores:
        print(f"    fully right guesses   min {right_scores[0]:.3f}")
    print(f"    non-food              max {other_scores[-1]:.3f}")

    if show_misses:
        misses = [r for r in food_rows if not r["result"]["matched"] or r["wrong"]] + \
                 [r for r in other_rows if r["result"]["matched"]]
        if misses:
            print("\n  Misses:")
        for r in misses:
            result = r["result"]
            got = result["match"]["id"] if result["matched"] else "(no guess)"
            detail = f" wrong {', '.join(r['wrong'])}" if r["wrong"] else ""
            print(f"    {r['case']['text']!r}: got {got} ({result['confidence']}){detail}")


def sweep(method, classifier, cases):
    print(f"\n=== {method} threshold sweep ===")
    for threshold in [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]:
        food.MIN_CONFIDENCE[method] = threshold
        rows = evaluate(classifier, cases)
        guessed = [r for r in rows if r["is_food"] and r["result"]["matched"]]
        right = sum(not r["wrong"] for r in guessed)
        wrong = sum(bool(r["wrong"]) for r in guessed) + sum(r["result"]["matched"] for r in rows if not r["is_food"])
        print(f"  {threshold:<5} guessed {len(guessed):>2}  fully right {right:>2}  confident but wrong {wrong:>2}")


def main():
    parser = argparse.ArgumentParser(description="Evaluate the food classifier.")
    parser.add_argument("--file", default=LABELED_PATH)
    parser.add_argument("--method", choices=["semantic", "tfidf", "both"], default="both")
    parser.add_argument("--show-misses", action="store_true")
    parser.add_argument("--sweep", action="store_true")
    args = parser.parse_args()

    catalog = load_food_catalog()
    cases = load_cases(args.file)
    methods = ["semantic", "tfidf"] if args.method == "both" else [args.method]

    for method in methods:
        classifier = FoodClassifier(catalog=catalog, model=load_model() if method == "semantic" else None)
        if args.sweep:
            sweep(method, classifier, cases)
        else:
            report(method, evaluate(classifier, cases), args.show_misses)


if __name__ == "__main__":
    main()
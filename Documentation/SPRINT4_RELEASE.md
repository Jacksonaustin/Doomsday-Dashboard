# Sprint 4 — Release

Doomsday Dashboard · Team 5 · Jackson Austin, Elijah Walton, Skyler Smith

## Release checklist

| Deliverable | Status | Notes |
| --- | --- | --- |
| Complete product | In progress | Food classifier is reachable from the backend (`POST /api/inventory/classify`). The inventory form still needs to call it and prefill. |
| Critical defects resolved | Done (pending merge) | See below. |
| Reproducible setup | Done (pending merge) | README quick start, AI service section, `AI_SERVICE_URL` in `.env.example`, optional local MongoDB, pinned torch. |
| Final documentation | In progress | README updated. Sprint 3 report still names the live test `aiService.integration.test.js`; the file is `mlService.integration.test.js`. |
| Demonstration | To do | Script below. |
| Retrospective | To do | Outline below. |

### Defects resolved this sprint

| Defect | Source | Fix |
| --- | --- | --- |
| A retried offline sign-out that got a 502/503 cleared the pending marker, so the next reload signed the user back in | Code review, PR #32 | The marker is cleared only on a 4xx (`client/src/context/AuthContext.jsx`) |
| A misspelled resource name searched the whole catalog and returned the wrong advice marked as matched (`drinking_watr` returned sanitation advice) | Sprint 3 integration testing | Unknown resources get generic advice with `matched: false`; the live integration test fails on it |
| TF-IDF fallback flagged 10 of 44 correct answers as low confidence | Sprint 3 AI evaluation | Threshold lowered from 0.2 to 0.06; now 1 of 44, still 100% top-1 and 0 confident-but-wrong |
| A backend run by hand never reached the AI service (`AI_SERVICE_URL` missing from `.env.example`), so it always showed generic advice | Setup review | Added to `.env.example` and the README |
| README listed the health check on port 5000; the API runs on 5050 | Setup review | Corrected |
| `compose.yaml` declared an unused model-cache volume, and the Docker guide said the model downloads at startup; it is built into the image | Setup review | Volume removed, guide corrected |

### Before release

- [ ] Commit the new tests and changes, then merge `feature/food-classifier` into `main`
- [ ] Inventory form calls `POST /api/inventory/classify` and prefills from `data.suggestion`
- [ ] Fresh-clone check: someone who has not run the app follows the README quick start on a clean machine
- [ ] All suites green, including `AI_INTEGRATION_URL=http://127.0.0.1:8000 npm test`
- [ ] Re-run `eval.run_eval` and `eval.run_food_eval`; update numbers in the final report

## Demo script (about 8 minutes)

Run against the Docker Compose stack on a fresh account. Record a backup video the day before.

1. **Problem (30 s).** Most households don't know whether their supplies would last through a real emergency.
2. **Sign up and household (1 min).** Create an account; set 2 adults, 1 child, 1 pet.
3. **Fast inventory entry (1.5 min).** Type `6 cans chicken noodle soup` and show the form fill in type and quantity. Add a brand name item. This answers both testers' Sprint 3 feedback.
4. **Simulation (1.5 min).** Run Tornado, explain the preparedness score and the top shortages.
5. **Recommendations (1.5 min).** Open them, point out they rank most severe first and are matched to the disaster, save one to the checklist.
6. **Offline (1 min).** Turn off the network, edit an item, turn it back on, show it sync.
7. **Under the hood (1 min).** Architecture slide; the AI evaluation table (semantic vs TF-IDF vs baselines); the cross-service contract and live integration tests.

Backup plan: if the AI service is slow to start, the app still works with fallback advice. Say so and switch to the recording for steps 3 and 5.

## Retrospective outline

Fill in as a team. Evidence to bring:

- 29 pull requests merged to `main` across the project (as of Nov 22)
- Sprint 3 AI evaluation and the two new cross-service tests
- Sprint 3 usability sessions (2 testers, both pointed at inventory entry)

| | Team notes |
| --- | --- |
| **What went well** | |
| **What didn't** | |
| **What we'd change** | |
| **What we learned** | |

Prompts:

- The food classifier was finished and evaluated in Sprint 3 but sat unconnected for a sprint. What kept it from landing sooner?
- Unit tests used a fake AI server and passed while a renamed resource would have broken the real handoff. Where else could fakes hide problems?
- Long-lived feature branches (`feature/food-classifier`) vs merging to `main` more often.
- How did the usability sessions change what we built?

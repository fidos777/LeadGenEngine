# PROJECT ATLAS
## Playbook v1.2.1 Addendum

Version: v1.2.1 (Addendum)  
Date: February 2026  
Supersedes: Clarifies v1.2 execution safety only (does not replace v1.1)  
Scope: Addendum format, guardrails, artifact templates, decision governance

---

## 0) Document Status And Precedence

This addendum removes ambiguity between v1.1 and v1.2.

Canonical documents:
1. `Atlas_Playbook_v1.1.docx` is the canonical **Execution Machine** policy (Sections 1-12).
2. `Atlas_Playbook_v1.2.docx` is the canonical **Reasoning Layer** content (Section 13).
3. This `v1.2.1` addendum is the canonical **governance and operating guardrail layer** for using Section 13 safely.

Precedence rule:
1. Revenue-first rule and calling-window protection always override stack output.
2. Cowork sprint sequencing authority always overrides stack output.
3. Stack outputs are advisory unless explicitly accepted by founder decision log.

If conflict occurs between any stack output and v1.1 execution constraints, v1.1 wins.

---

## 1) Incorporation Rule (How To Use v1.2 Safely)

Treat v1.2 as an add-on layer inserted into v1.1 at defined control points only:
1. Before sprint queue creation (Stack A).
2. Monday signal review (Stack B).
3. Proposal-critical decisions (Stack C).
4. Live critical failure response (Stack D).
5. Revenue pivot simulation after data gate (Stack E).

No stack may be used for atomic execution tasks (lint fixes, route-level coding decisions, merge ordering, UI component choices).

---

## 2) Global Guardrails (Non-Negotiable)

### 2.1 Timebox And Stop Rules
1. Hard timebox per stack run: 30 minutes.
2. Maximum reruns per decision: 1 rerun.
3. If rerun does not produce a materially different recommendation, stop analysis and execute via Cowork.
4. Never run stacks during calling windows (8:00-10:00am, 2:00-4:00pm local).

### 2.2 Activation Threshold
Run a stack only when one is true:
1. Wrong decision risk is > RM10k equivalent impact.
2. Wrong decision risk can consume >= 1 full sprint.
3. Decision has irreversible client, pricing, or contract implications.

If none are true, do not run a stack.

### 2.3 Decision Accountability
1. Stacks propose; founder approves.
2. No stack output is executable until captured in a `DECISION_LOG` artifact.
3. Cowork can only update `SPRINT_QUEUE.md` after decision log acceptance.

---

## 3) Conflict Resolution Protocol

When recommendations conflict:
1. Apply Revenue Filter first: does this improve booked appointments this week?
2. Apply Boundary Filter second: does this violate v1.1 role boundaries?
3. Apply Calling Window Filter third: does this consume protected call time?
4. If still unresolved, founder writes explicit tie-break in `DECISION_LOG`.

Tie-break default:
- Cowork revenue-first sequencing wins.
- Stack recommendation moves to backlog with rationale.

---

## 4) Artifact Contract (Required Outputs)

All stack runs must produce saved artifacts in repo.

Directory:
- `docs/playbook/artifacts/`

Naming:
1. Stack A: `STACK_A_SPRINT_PLANNING_YYYY-MM-DD.md`
2. Stack B: `STACK_B_WEEKLY_REVIEW_YYYY-WW.md`
3. Stack C: `STACK_C_PROPOSAL_<client>_YYYY-MM-DD.md`
4. Stack D: `STACK_D_INCIDENT_<short-id>_YYYY-MM-DD.md`
5. Stack E: `STACK_E_PIVOT_SIM_<topic>_YYYY-MM-DD.md`
6. Required approval record: `DECISION_LOG_YYYY-MM-DD.md`

Minimum fields (all artifacts):
1. Trigger and activation threshold justification.
2. Inputs used (data sources and date range).
3. Advisor outputs (structured).
4. Synthesis recommendation.
5. Confidence level (high/medium/low).
6. Risks if adopted.
7. Risks if deferred.
8. Final founder decision.
9. Next owner and due date.

Retention:
1. Keep all artifacts for 2 full billing cycles minimum.
2. Do not delete prior artifacts; append supersession notes.

---

## 5) Stack-Specific Guardrails

### Stack A (Sprint Planning Board)
1. Input must include current `SPRINT_QUEUE` draft and prior sprint closeout.
2. Output cannot directly overwrite queue; must pass through Cowork.
3. Maximum Priority 1 items: 5.

### Stack B (Weekly Revenue Review)
1. Must include prior week comparator metrics.
2. Must output one actionable Monday Top 5 only.
3. If data quality is insufficient, output "NO STRATEGIC CHANGE" and continue baseline execution.

### Stack C (Proposal Refinement)
1. Every claim must be tied to a cited internal source or explicit assumption.
2. Any uncited claim must be marked as assumption.
3. Final language must pass platform framing check (no freelancer framing).

### Stack D (Dynamic Stress Response)
1. Must define minimum fix scope before full fix scope.
2. Every recovery step must be <= 4 hours.
3. Must output revised sprint gate date and buffer-day impact.

### Stack E (Revenue Pivot Simulation)
1. Gate required: >= 8 weeks data, >= 4 delivered appointments, >= 1 full billing cycle.
2. Output is a Pivot Brief only, never an automatic pivot action.
3. Pivot execution requires explicit founder decision and Cowork queue update.

---

## 6) Operating KPIs For Reasoning Layer (4-Week Review)

Track monthly:
1. `stack_runs_total`
2. `stack_runs_accepted`
3. `decision_delta_rate` (how often stack changed initial decision)
4. `analysis_overrun_count` (timebox violations)
5. `prevented_slip_count` (documented sprint slips avoided)
6. `revenue_impact_notes` (qualitative link to outcomes)

At 4-week review:
1. Keep stacks with clear decision-quality benefit.
2. Modify stacks with high run cost and low decision delta.
3. Suspend stacks that repeatedly violate timebox without measurable benefit.

---

## 7) Templates (Copy/Paste Ready)

### 7.1 Artifact Template

```md
# <STACK_ID> Artifact

Date: YYYY-MM-DD
Owner: <name>
Trigger: <what decision/failure triggered this>
Activation Threshold Met: <RM impact / sprint impact justification>

## Inputs
- Data sources:
- Date range:
- Known constraints:

## Advisor Outputs
1. Advisor name:
   - Output:
2. Advisor name:
   - Output:

## Synthesis
- Recommended action:
- Confidence: High / Medium / Low
- Risks if adopted:
- Risks if deferred:

## Decision
- Founder decision: Accept / Reject / Modify
- Rationale:
- Queue impact:
- Owner + due date:
```

### 7.2 Decision Log Template

```md
# DECISION_LOG_YYYY-MM-DD

Decision ID: ATLAS-DEC-<number>
Related artifact: <path>
Decision type: Sprint / Proposal / Incident / Pivot

Final decision:
Reason:
What was rejected:
Why rejected:

Execution handoff:
- Cowork action:
- Code/Codex/Manual owner:
- Due date:

Post-check date:
```

### 7.3 No-Run Record Template

```md
# NO_RUN_RECORD_YYYY-MM-DD

Decision context:
Why stack not run:
- Impact below threshold? (yes/no)
- Atomic execution task? (yes/no)
- Calling window conflict? (yes/no)

Chosen path:
Owner:
Due date:
```

---

## 8) Immediate Adoption Checklist

1. Create artifact directory: `docs/playbook/artifacts/`.
2. Use this addendum for all new stack runs starting immediately.
3. Require `DECISION_LOG` before any stack-derived queue change.
4. Review reasoning-layer KPIs after 4 weeks and adjust stack usage.

Execution-safe definition:
- If a stack run does not produce a logged decision and owner/due-date handoff, the run is incomplete and non-binding.

# Food Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an optional food selection step between seats and payment.

**Architecture:** Keep food catalog and calculation logic in `frontend/lib/foodSelection.mjs`. Keep the route shell as a Server Component and put interactive state in `FoodSelectionClient.jsx`. Store selected food in the existing `movieReservationDraft` session storage object so confirmation and completion can reuse the current flow.

**Tech Stack:** Next.js App Router, React client components, sessionStorage, plain CSS utility classes, Vitest/node tests.

---

### Task 1: Food Selection Logic

**Files:**
- Create: `frontend/lib/foodSelection.test.mjs`
- Create: `frontend/lib/foodSelection.mjs`

- [ ] Write failing tests for category data, quantity changes, selected item summaries, and draft merging.
- [ ] Run `npx vitest run lib/foodSelection.test.mjs` from `frontend` and verify the module is missing.
- [ ] Implement the catalog and pure helpers.
- [ ] Re-run the food-selection test and verify it passes.

### Task 2: Food Route UI

**Files:**
- Create: `frontend/app/food/page.tsx`
- Create: `frontend/app/food/FoodSelectionClient.jsx`
- Create: `frontend/public/images/food/.gitkeep`

- [ ] Add the route shell with `CampaignHeader`.
- [ ] Add the client component with rotating hero slides, category chips, horizontal category rows, item quantity controls, order summary, continue, and skip actions.
- [ ] Store selected food into `movieReservationDraft` before navigating to `/confirm`.

### Task 3: Existing Flow Integration

**Files:**
- Modify: `frontend/app/seats/SeatSelectionClient.jsx`
- Modify: `frontend/lib/purchaseConfirmation.test.mjs`
- Modify: `frontend/lib/purchaseConfirmation.mjs`
- Modify: `frontend/lib/purchaseCompletion.test.mjs`
- Modify: `frontend/lib/purchaseCompletion.mjs`
- Modify: `frontend/app/comfirm/ReservationPanel.jsx`
- Modify: `frontend/app/complete/PurchaseSummary.jsx`

- [ ] Change seat selection to navigate to `/food`.
- [ ] Extend confirmation tests for food item display and total price.
- [ ] Extend completion tests for food item display and total price.
- [ ] Update confirmation and completion helpers to include optional food summaries.
- [ ] Render food rows only when food items exist.

### Task 4: Verification

**Files:**
- Check all modified files.

- [ ] Run targeted tests for food, confirmation, completion, and route links.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

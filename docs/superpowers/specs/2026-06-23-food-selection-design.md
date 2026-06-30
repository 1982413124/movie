# Food Selection Design

## Goal

Add an optional food selection page between seat selection and payment.

## Flow

The existing reservation flow is `/seats` -> `/confirm`. The new flow is `/seats` -> `/food` -> `/confirm`. Food is optional, so the user can continue to payment with no selected food items.

## Route And Files

- `frontend/app/food/page.tsx` exposes the `/food` route.
- `frontend/app/food/FoodSelectionClient.jsx` owns interactive quantity changes, category navigation, hero rotation, and draft persistence.
- `frontend/lib/foodSelection.mjs` owns food catalog data and pure selection calculations.
- `frontend/public/images/food/` is the placeholder image directory for future assets.

## Data Flow

Seat selection already writes `movieReservationDraft` to session storage. The food page reads that draft, adds `foodItems`, `foodTotalPrice`, and an updated `totalPrice`, then navigates to `/confirm`. If no food is selected, it writes an empty food list and leaves the ticket total unchanged.

## UI

The page has a rotating promotional hero at the top. Below that, category chips mirror the requested grouping: recommended, popcorn, drinks, hot snacks, and sweets. Each category row has its own horizontal scroller and a right-aligned "show all" button. Item cards use plus and minus controls for quantity.

## Confirmation And Completion

The confirmation and completion summaries show food details only when at least one item is selected. With no food items, existing ticket-only behavior remains unchanged.

## Verification

Pure food-selection behavior is covered by tests before implementation. Existing confirmation and completion tests are extended for food totals. Final checks are targeted tests, lint, and Next.js build.

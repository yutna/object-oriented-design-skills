# Conventions

- Discount rules live in `src/billing/discount-rules.ts` as plain
  functions that take the values they need. The finance team
  reviews that one file, so a discount rule never moves into a
  class.
- One exported class or one rule file per module.

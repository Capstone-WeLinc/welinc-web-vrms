/*
  Suite spec 0016 AC-7 (design.md, Components: Fields). One source for the look every text field,
  select, combobox and OTP cell shares. Focus is a 2px navy edge drawn inside the box (the 1px border
  plus a 1px inset ring), so nothing moves and no ring sits outside it, whatever padding the caller set.
*/
export const fieldRest =
  "rounded-lg border border-input bg-card text-base-input text-foreground transition-colors outline-none placeholder:text-muted-foreground md:text-body"

export const fieldFocus = "focus-visible:border-primary focus-visible:inset-ring-1 focus-visible:inset-ring-primary"

/** For a box that holds the focused element (an OTP cell, a wrapper with an icon) instead of being it. */
export const fieldFocusWithin = "focus-within:border-primary focus-within:inset-ring-1 focus-within:inset-ring-primary"

export const fieldInvalid =
  "aria-invalid:border-error aria-invalid:focus-visible:border-error aria-invalid:focus-visible:inset-ring-error"

export const fieldDisabled =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"

/** Text inputs only: buttons match :read-only too, so a select or combobox trigger never takes this. */
export const fieldReadOnly = "read-only:border-transparent read-only:bg-muted"

export const fieldControl = [fieldRest, fieldFocus, fieldInvalid, fieldDisabled].join(" ")

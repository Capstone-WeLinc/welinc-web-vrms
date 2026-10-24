/** The password rules welinc-auth enforces, as the first rule a password breaks, or null. */
export function validatePassword(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(trimmed)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(trimmed)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/\d/.test(trimmed)) {
    return 'Password must include at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return 'Password must include at least one special character.';
  }
  return null;
}

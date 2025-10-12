///////////////passwordResetSchemas.ts/////////////////

// a simple email validator schema
// It returns the normalized email if valid, otherwise null
export const validateEmail = (e: string) => {
  const s = e.trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(s) ? s : null;
};

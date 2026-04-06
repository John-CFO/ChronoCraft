//////////////////////////// normalizeCreatedAt.helper.ts ////////////////////

// This file is used to normalize the created_at field in the database,
// if a project will be rendered and sorted by created_at.

///////////////////////////////////////////////////////////////////////////////

export const normalizeCreatedAt = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof (value as any)?.toDate === "function") {
    return (value as any).toDate();
  }

  if (typeof value === "number") return new Date(value);

  const parsed = new Date(value as any);
  return isNaN(parsed.getTime()) ? null : parsed;
};

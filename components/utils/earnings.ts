/////////////////////////////////earnings.ts///////////////////////////////

// This files contains the functions to calculate the earnings

///////////////////////////////////////////////////////////////////////////

// help function to calculate the earnings
export function computeEarnings(seconds: number, hourlyRate: number): number {
  return parseFloat(((seconds / 3600) * hourlyRate).toFixed(2));
}

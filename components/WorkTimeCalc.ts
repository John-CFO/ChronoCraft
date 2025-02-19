///////////////////////////////WorkTimeCalc/////////////////////////////////////////////

// This utility modul function formats and rounds the WorkHours time
export const formatTime = (timeInHours: number): string => {
  const hours = Math.floor(timeInHours);
  const minutes = Math.floor((timeInHours - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

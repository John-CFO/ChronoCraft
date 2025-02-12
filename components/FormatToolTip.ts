//////////////////////////FormatToolTip.ts//////////////////////////////////////

// This modul is used to format the date in the WorkHours chart tooltip
export const formatTooltipDate = (dateString?: string): string => {
  if (!dateString) return "No date available";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "unknown date";
  return `${date.toLocaleDateString("de-DE", { weekday: "long" })}
  \n${date.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}`;
};

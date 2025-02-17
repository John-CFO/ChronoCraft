//////////////////////////FormatToolTip.ts//////////////////////////////////////

// This modul is used to format the date in the WorkHours chart tooltip
export const formatTooltipDate = (
  dateString?: string,
  chartType?: string
): string => {
  if (!dateString) return "No date available";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "unknown date";
  // condition: if the chart type is "year" only show the month
  if (chartType === "year") {
    return date.toLocaleDateString("en-GB", { month: "long" });
  }
  return `${date.toLocaleDateString("en-GB", { weekday: "long" })}\n${date.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })}`;
};

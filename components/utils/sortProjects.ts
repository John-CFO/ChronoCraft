///////////////////////////// sortProjects.ts //////////////////////////////

// This file is used to sort the projects in the HomeScreen

////////////////////////////////////////////////////////////////////////////

import { normalizeCreatedAt } from "../helper/normalizeCreatedAt.helper";
import { Project } from "../types/Project";

////////////////////////////////////////////////////////////////////////////

export function sortProjects(
  projects: Project[],
  sortOrder: string,
): Project[] {
  return [...projects].sort((a, b) => {
    const aDate = normalizeCreatedAt(a.createdAt);
    const bDate = normalizeCreatedAt(b.createdAt);

    const aTime = aDate ? aDate.getTime() : 0;
    const bTime = bDate ? bDate.getTime() : 0;

    switch (sortOrder) {
      case "DATE_DESC":
        return bTime - aTime;

      case "DATE_ASC":
        return aTime - bTime;

      case "NAME_ASC":
        return a.name.localeCompare(b.name);

      case "NAME_DESC":
        return b.name.localeCompare(a.name);

      default:
        return 0;
    }
  });
}

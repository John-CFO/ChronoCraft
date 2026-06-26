//////////////////// Project.ts //////////////////////

// This file is used to define the type of the project object in ProjectListItem.ts

////////////////////////////////////////////////////////

export interface Project {
  id: string;
  name: string;
  createdAt: Date | null;
}

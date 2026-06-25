///////////////////////////// projects.api.ts //////////////////////////////

// This file is used to define the api for the projects

////////////////////////////////////////////////////////////////////////////

import { normalizeCreatedAt } from "../components/helper/normalizeCreatedAt.helper";
import { projectsAndWorkValidatorCallable } from "../firebase/functions";
import { unwrapBody } from "../components/helper/unwrapBody";
import { Project } from "../components/types/Project";

////////////////////////////////////////////////////////////////////////////

export async function fetchProjects(serviceId: string): Promise<Project[]> {
  const res = await projectsAndWorkValidatorCallable({
    action: "getProjects",
    payload: {
      serviceId,
    },
  });

  const body = unwrapBody(res.data);

  return (body?.projects ?? []).map((project: any) => ({
    id: project.id,
    ...project,
    name: project.name ?? "",
    createdAt: normalizeCreatedAt(project.createdAt),
  }));
}

export async function createProject(
  serviceId: string,
  name: string,
): Promise<{ projectId: string }> {
  const res = await projectsAndWorkValidatorCallable({
    action: "createProject",
    payload: {
      name,
      serviceId,
    },
  });

  return unwrapBody(res.data);
}

export async function deleteProject(serviceId: string, projectId: string) {
  await projectsAndWorkValidatorCallable({
    action: "deleteProject",
    payload: {
      projectId,
      serviceId,
    },
  });
}

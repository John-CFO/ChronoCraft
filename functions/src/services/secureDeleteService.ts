/////////////////////// secureDeleteService.ts //////////////////////////////

// This file contains the implementation of the SecureDeleteService class,
// which is used to interact with the Firestore database.

//////////////////////////////////////////////////////////////////////////////

import { ProjectRepo } from "../repos/projectRepo";
import { logEvent } from "../utils/logger";

//////////////////////////////////////////////////////////////////////////////

export class SecureDeleteService {
  // ProjectRepo inside SecureDeleteService
  private projectRepo = new ProjectRepo();

  // deleteUserService method
  async deleteUserService(userId: string, serviceId: string, subs: string[]) {
    await this.projectRepo.deleteSubcollections(
      ["Users", userId, "Services", serviceId],
      subs
    );
    logEvent("secure delete", "info", { uid: userId, serviceId });
    return { success: true };
  }
}

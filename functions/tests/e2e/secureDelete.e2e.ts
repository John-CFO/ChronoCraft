////////////////////////////// secureDelete (E2E) //////////////////////////////////////

//  If those tests ever pass, we have an security issue with the authValidator (critical)

////////////////////////////////////////////////////////////////////////////////////////

import { httpsCallable } from "firebase/functions";
import { functions } from "./setup";

////////////////////////////////////////////////////////////////////////////////////////

type DeleteResponse = { success: boolean };

////////////////////////////////////////////////////////////////////////////////////////

describe("secureDelete (E2E)", () => {
  it("blocks deletion of foreign user data", async () => {
    const call = httpsCallable<any, DeleteResponse>(functions, "secureDelete");

    await expect(
      call({
        userId: "victimUid",
        serviceId: "service1",
        subs: [],
      })
    ).rejects.toMatchObject({
      code: "functions/permission-denied",
    });
  });
});

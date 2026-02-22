///////////////////// projectAndWorkValidator.function.ts ///////////////////////////

// This file contains the handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { onCall, CallableRequest } from "firebase-functions/v2/https";

import { projectsAndWorkValidatorLogic } from "./projectAndWorkValidator.logic";

/////////////////////////////////////////////////////////////////////////////////////

export const projectsAndWorkValidator = onCall(
  async (request: CallableRequest<any>) => {
    return projectsAndWorkValidatorLogic(request);
  },
);

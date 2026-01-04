///////////////////// projectAndWorkValidator.function.ts ///////////////////////////

// This file contains the handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { projectsAndWorkValidatorLogic } from "./projectAndWorkValidator.logic";

/////////////////////////////////////////////////////////////////////////////////////

export const projectsAndWorkValidator = https.onCall(
  projectsAndWorkValidatorLogic
);

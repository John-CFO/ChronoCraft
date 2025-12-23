////////////// LogicError.ts ////////////////////////////

// This file is used to create a custom error class for logic errors

////////////////////////////////////////////////////////////

import { FirebaseFunctionErrorCode } from "./firebaseErrors";

////////////////////////////////////////////////////////////

export class LogicError extends Error {
  code: FirebaseFunctionErrorCode;

  constructor(code: FirebaseFunctionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

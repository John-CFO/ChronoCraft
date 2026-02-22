////////////////////////////// totpService.ts /////////////////////////////////////////

// This file contains the functions for the two-factor authentication service

///////////////////////////////////////////////////////////////////////////////////////

import { httpsCallable } from "firebase/functions";
import { FIREBASE_FUNCTIONS } from "../../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////////////

// function to check if TOTP is enabled
export const checkTotpStatus = httpsCallable<
  void,
  {
    enabled: boolean;
    hasSecret: boolean;
  }
>(FIREBASE_FUNCTIONS, "checkTotpStatus");

// function to create a TOTP secret
export const createTotpSecret = httpsCallable<
  void,
  {
    secret: string;
    message: string;
  }
>(FIREBASE_FUNCTIONS, "createTotpSecret");

// function to verify a TOTP token
export const verifyTotp = httpsCallable<
  { token: string },
  {
    valid: boolean;
    message: string;
  }
>(FIREBASE_FUNCTIONS, "verifyTotpToken");

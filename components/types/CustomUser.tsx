////////////CustomUser type definition import to handle conflict with FirebaseUser//////////

import { User as FirebaseUser } from "firebase/auth";

//////////////////////////////////////////////////////////////7
export interface CustomUser extends FirebaseUser {
  personalID?: string;
}

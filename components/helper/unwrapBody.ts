///////////////////////// unwrapBody.ts //////////////////////////

// This file is used to unwrap the body of the response from the firebase functions

//////////////////////////////////////////////////////////////////

export const unwrapBody = (body: any): any => {
  if (body && typeof body === "object" && "result" in body) {
    return body.result;
  }

  return body;
};

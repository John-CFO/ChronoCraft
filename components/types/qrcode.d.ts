// declare module "qrcode" for the typescript compiler

declare module "qrcode" {
  export function toDataURL(text: string, opts?: any): Promise<string>;
  const qrcode: any;
  export default qrcode;
}

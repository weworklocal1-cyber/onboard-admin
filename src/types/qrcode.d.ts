declare module "qrcode" {
  export function toDataURL(data: string, options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }): Promise<string>;
}
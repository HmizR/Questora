declare module "pdf-parse" {
  export default function pdfParse(dataBuffer: Buffer): Promise<{ text: string }>;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  export default function pdfParse(dataBuffer: Buffer): Promise<{ text: string }>;
}

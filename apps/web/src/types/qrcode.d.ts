declare module 'qrcode' {
  interface QRCodeSymbol {
    modules: {
      size: number;
      get(row: number, col: number): boolean;
    };
  }

  interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: { dark?: string; light?: string };
  }

  interface QRCodeFactory {
    create(
      text: string,
      options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
    ): QRCodeSymbol;
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  }

  const qrcode: QRCodeFactory;
  export default qrcode;
}

declare module 'qrcode' {
  interface QRCodeSymbol {
    modules: {
      size: number;
      get(row: number, col: number): boolean;
    };
  }

  interface QRCodeFactory {
    create(
      text: string,
      options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' },
    ): QRCodeSymbol;
  }

  const qrcode: QRCodeFactory;
  export default qrcode;
}

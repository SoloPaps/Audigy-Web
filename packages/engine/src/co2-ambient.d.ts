declare module '@tgwf/co2' {
  export class co2 {
    constructor(options?: {
      model?: 'swd' | '1byte';
      version?: 3 | 4;
      rating?: boolean;
    });
    perVisit(
      bytes: number,
      green?: boolean,
    ): number | { total: number; rating: string };
  }
}

declare global {
  namespace PrismaJson {
    type ScraperConfiguration = {
      defaultMarketPrice?: number;
      headers?: { [key: string]: string };
      selector: string;
      url: string;
    };
  }
}

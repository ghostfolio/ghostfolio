import { Component } from '@angular/core';

@Component({
  selector: 'gf-resources-glossary',
  styleUrls: ['./resources-glossary.component.scss'],
  templateUrl: './resources-glossary.component.html'
})
export class ResourcesGlossaryPageComponent {
  public glossaryItems = [
    {
      term: 'Buy and Hold',
      definition:
        'Buy and hold is a passive investment strategy where you buy assets and hold them for a long period regardless of fluctuations in the market.',
      link: 'https://www.investopedia.com/terms/b/buyandhold.asp'
    },
    {
      term: 'Deflation',
      definition:
        'Deflation is a decrease of the general price level for goods and services in an economy over a period of time.',
      link: 'https://www.investopedia.com/terms/d/deflation.asp'
    },
    {
      term: 'Dollar-Cost Averaging (DCA)',
      definition:
        'Dollar-cost averaging is an investment strategy where you split the total amount to be invested across periodic purchases of a target asset to reduce the impact of volatility on the overall purchase.',
      link: 'https://www.investopedia.com/terms/d/dollarcostaveraging.asp'
    },
    {
      term: 'Financial Independence',
      definition:
        'Financial independence is the status of having enough income, for example with a passive income like dividends, to cover your living expenses for the rest of your life.',
      link: 'https://en.wikipedia.org/wiki/Financial_independence'
    },
    {
      term: 'FIRE',
      definition:
        'FIRE is a movement that promotes saving and investing to achieve financial independence and early retirement.',
      link: '../en/blog/2023/07/exploring-the-path-to-fire'
    },
    {
      term: 'Inflation',
      definition:
        'Inflation is an increase of the general price level for goods and services in an economy over a period of time.',
      link: 'https://www.investopedia.com/terms/i/inflation.asp'
    },
    {
      term: 'Stagflation',
      definition:
        'Stagflation describes a situation in which there is a stagnant economy with high unemployment and high inflation.',
      link: 'https://www.investopedia.com/terms/s/stagflation.asp'
    }
  ];
}

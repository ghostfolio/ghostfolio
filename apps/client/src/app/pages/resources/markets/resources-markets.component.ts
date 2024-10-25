import { Component } from '@angular/core';

@Component({
  selector: 'gf-resources-markets',
  styleUrls: ['./resources-markets.component.scss'],
  templateUrl: './resources-markets.component.html'
})
export class ResourcesMarketsComponent {
  public marketResources = [
    {
      title: 'Crypto Coins Heatmap',
      description:
        'With the Crypto Coins Heatmap you can track the daily market movements of cryptocurrencies as a visual snapshot.',
      link: 'https://www.tradingview.com/heatmap/crypto'
    },
    {
      title: 'Fear & Greed Index',
      description:
        'The fear and greed index was developed by CNNMoney to measure the primary emotions (fear and greed) that influence how much investors are willing to pay for stocks.',
      link: 'https://money.cnn.com/data/fear-and-greed/'
    },
    {
      title: 'Inflation Chart',
      description:
        'Inflation Chart helps you find the intrinsic value of stock markets, stock prices, goods and services by adjusting them to the amount of the money supply (M0, M1, M2) or price of other goods (food or oil).',
      link: 'https://inflationchart.com'
    },
    {
      title: 'Stock Heatmap',
      description:
        'With the Stock Heatmap you can track the daily market movements of stocks as a visual snapshot.',
      link: 'https://www.tradingview.com/heatmap/stock'
    }
  ];
}

import { Component } from '@angular/core';

@Component({
  selector: 'gf-resources-guides',
  templateUrl: './resources-guides.component.html',
  styleUrls: ['./resources-guides.component.scss']
})
export class ResourcesGuidesComponent {
  public guides = [
    {
      title: 'Boringly Getting Rich',
      description:
        'The Boringly Getting Rich guide supports you to get started with investing. It introduces a strategy utilizing a broadly diversified, low-cost portfolio excluding the risks of individual stocks.',
      link: 'https://herget.me/investing-guide'
    },
    {
      title: 'How do I get my finances in order?',
      description:
        'Before you can think of long-term investing, you have to get your finances in order. Learn how you can reach your financial goals easier and faster in this guide.',
      link: '../en/blog/2022/07/how-do-i-get-my-finances-in-order'
    }
  ];
}

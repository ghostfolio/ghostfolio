import { PortfolioOrder } from './portfolio-order.interface';

export interface PortfolioOrderItem extends PortfolioOrder {
  itemType?: '' | 'start' | 'end';
}

export interface AccountBalances {
    balances: AccountBalance[];
}

export interface AccountBalance {
    date: Date;
    id: string;
    value: number;
}

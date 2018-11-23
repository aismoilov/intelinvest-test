import {Decimal} from "decimal.js";

export class BigMoney {

    private amountValue: Decimal;

    private currencyValue: string;

    constructor(private value: string) {
        if (value) {
            const ar = value.split(" ");
            this.amountValue = new Decimal(ar[1]);
            this.currencyValue = ar[0];
        }
    }

    get amount(): Decimal {
        return this.amountValue;
    }

    get currency(): string {
        return this.currencyValue;
    }
}
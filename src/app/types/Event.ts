export class Event {
    date: string;
    totalAmount: string;
    quantity: number;
    label: string;
    type: string;

    price() {
        return this.totalAmount.split(' ')[1];
    }
};
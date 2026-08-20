declare module "razorpay" {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
    host?: string;
    port?: number;
  }

  interface RazorpayOrderResponse {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
  }

  interface RazorpayPaymentResponse {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    method: string;
    created_at: number;
  }

  class Razorpay {
    static VERSION: string;
    constructor(options: RazorpayOptions);
    orders: any;
    payments: any;
    refunds: any;
    subscriptions: any;
    invoices: any;
  }

  export = Razorpay;
}

export interface RefundInput {
    fullPriceAmount: number;
    paymentDate: Date;
    refundRequestDate: Date;
    applyPenalty?: boolean;
    penaltyRate?: number;
    tabletNotReturned?: boolean;
    tabletPurchasePrice?: number;
}
export interface RefundCalculation {
    usageDays: number;
    usageMonths: number;
    monthlyRate: number;
    usageFee: number;
    penaltyAmount: number;
    tabletDeduction: number;
    refundAmount: number;
    refundEligible: boolean;
    refundRule: 'full' | 'usage_deduct' | 'no_refund';
    notes: string;
}
export declare function calculateRefund(input: RefundInput): RefundCalculation;
//# sourceMappingURL=refund.calculator.d.ts.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRefund = calculateRefund;
const refund_constants_1 = require("../constants/refund.constants");
function calculateRefund(input) {
    const { fullPriceAmount, paymentDate, refundRequestDate, applyPenalty = true, penaltyRate = refund_constants_1.DEFAULT_PENALTY_RATE, tabletNotReturned = false, tabletPurchasePrice = 0, } = input;
    const usageDays = Math.floor((refundRequestDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
    const usageMonths = usageDays / 30;
    const monthlyRate = Math.floor(fullPriceAmount / refund_constants_1.MONTHS_PER_YEAR);
    // 환불 불가 구간
    if (usageMonths >= refund_constants_1.REFUND_WINDOWS.NO_REFUND_MONTHS) {
        return {
            usageDays,
            usageMonths,
            monthlyRate,
            usageFee: fullPriceAmount,
            penaltyAmount: 0,
            tabletDeduction: tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0,
            refundAmount: 0,
            refundEligible: false,
            refundRule: 'no_refund',
            notes: `구독 ${refund_constants_1.REFUND_WINDOWS.NO_REFUND_MONTHS}개월 이후 환불 불가`,
        };
    }
    // 7일 이내 전액 환불
    if (usageDays <= refund_constants_1.REFUND_WINDOWS.FULL_REFUND_DAYS) {
        const tabletDeduction = tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0;
        const refundAmount = Math.max(0, fullPriceAmount - tabletDeduction);
        return {
            usageDays,
            usageMonths,
            monthlyRate,
            usageFee: 0,
            penaltyAmount: 0,
            tabletDeduction,
            refundAmount,
            refundEligible: true,
            refundRule: 'full',
            notes: `구독 ${refund_constants_1.REFUND_WINDOWS.FULL_REFUND_DAYS}일 이내 전액 환불`,
        };
    }
    // 사용료 공제 환불
    const usedMonthsCeil = Math.ceil(usageMonths);
    const usageFee = usedMonthsCeil * monthlyRate;
    const base = fullPriceAmount - usageFee;
    const penaltyAmount = applyPenalty ? Math.floor(base * penaltyRate) : 0;
    const tabletDeduction = tabletNotReturned ? (tabletPurchasePrice ?? 0) : 0;
    const refundAmount = Math.max(0, base - penaltyAmount - tabletDeduction);
    return {
        usageDays,
        usageMonths,
        monthlyRate,
        usageFee,
        penaltyAmount,
        tabletDeduction,
        refundAmount,
        refundEligible: refundAmount > 0,
        refundRule: 'usage_deduct',
        notes: `사용 ${usedMonthsCeil}개월 기준 정상가(${fullPriceAmount.toLocaleString()}원) 환불`,
    };
}
//# sourceMappingURL=refund.calculator.js.map
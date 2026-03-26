import type { Request, Response, NextFunction } from 'express';
import * as paymentsService from '../../services/payments/payments.service';

export async function listPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const memberId = req.query.memberId as string | undefined;
    const result = await paymentsService.listPayments(memberId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberId, amountPaid, amountFullPrice, paymentMethod, notes } = req.body as {
      memberId: string; amountPaid: number; amountFullPrice: number;
      paymentMethod?: string; notes?: string;
    };
    const result = await paymentsService.createPayment({
      memberId, amountPaid, amountFullPrice, paymentMethod, notes,
      processedBy: req.user?.adminId,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function calculateRefundPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentId, refundRequestDate } = req.query as { paymentId: string; refundRequestDate?: string };
    const date = refundRequestDate ? new Date(refundRequestDate) : undefined;
    const result = await paymentsService.calculateRefundPreview(paymentId, date);
    res.json(result);
  } catch (e) { next(e); }
}

export async function listRefunds(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string | undefined;
    const result = await paymentsService.listRefunds(status);
    res.json(result);
  } catch (e) { next(e); }
}

export async function requestRefund(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberId, paymentId, reason } = req.body as {
      memberId: string; paymentId: string; reason?: string;
    };
    const result = await paymentsService.requestRefund({
      memberId, paymentId, reason,
      requestedBy: req.user?.adminId,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function approveRefund(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentsService.approveRefund(req.params.id, req.user?.adminId);
    res.json(result);
  } catch (e) { next(e); }
}

export async function rejectRefund(req: Request, res: Response, next: NextFunction) {
  try {
    const { rejectionReason } = req.body as { rejectionReason: string };
    const result = await paymentsService.rejectRefund(req.params.id, rejectionReason, req.user?.adminId);
    res.json(result);
  } catch (e) { next(e); }
}

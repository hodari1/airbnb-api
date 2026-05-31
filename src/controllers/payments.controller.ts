import { Request, Response } from "express";
import prisma from "../prisma";

export const getPaymentMethods = async (req: any, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: methods });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payment methods" });
  }
};

export const addPaymentMethod = async (req: any, res: Response) => {
  try {
    const { type, label, details, isDefault } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "Type and label are required" });
    }

    // If setting as default, unset others
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        type,
        label,
        details: details || {},
        isDefault: isDefault || false,
        userId: req.user.id,
      },
    });
    res.status(201).json({ data: method, message: "Payment method added" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add payment method" });
  }
};

export const deletePaymentMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ message: "Payment method removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove payment method" });
  }
};

export const setDefaultPaymentMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false },
    });
    await prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
    res.json({ message: "Default payment method updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update default" });
  }
};

// ─── Payout Methods ───────────────────────────────────────────

export const getPayoutMethods = async (req: any, res: Response) => {
  try {
    const methods = await prisma.payoutMethod.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: methods });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payout methods" });
  }
};

export const addPayoutMethod = async (req: any, res: Response) => {
  try {
    const { type, label, details, isDefault } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "Type and label are required" });
    }

    if (isDefault) {
      await prisma.payoutMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const method = await prisma.payoutMethod.create({
      data: {
        type,
        label,
        details: details || {},
        isDefault: isDefault || false,
        userId: req.user.id,
      },
    });
    res.status(201).json({ data: method, message: "Payout method added" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add payout method" });
  }
};

export const deletePayoutMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.payoutMethod.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ message: "Payout method removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove payout method" });
  }
};

// ─── Payments History ─────────────────────────────────────────

export const getPayments = async (req: any, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        booking: {
          include: { listing: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payments });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payments" });
  }
};

// ─── Payouts History ──────────────────────────────────────────

export const getPayouts = async (req: any, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payouts });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payouts" });
  }
};
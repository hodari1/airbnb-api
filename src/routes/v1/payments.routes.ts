import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getPayoutMethods,
  addPayoutMethod,
  deletePayoutMethod,
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayouts,
} from "../../controllers/payments.controller";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment methods and history
 */

// ─── Payment Methods ──────────────────────────────────────────

/**
 * @swagger
 * /api/v1/payments/methods:
 *   get:
 *     summary: Get user payment methods
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 */
router.get("/methods", getPaymentMethods);

/**
 * @swagger
 * /api/v1/payments/methods:
 *   post:
 *     summary: Add a payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, label]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CREDIT_CARD, DEBIT_CARD, MOBILE_MONEY, BANK_TRANSFER]
 *               label:
 *                 type: string
 *               details:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payment method added
 */
router.post("/methods", addPaymentMethod);

/**
 * @swagger
 * /api/v1/payments/methods/{id}:
 *   delete:
 *     summary: Remove a payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed
 */
router.delete("/methods/:id", deletePaymentMethod);

/**
 * @swagger
 * /api/v1/payments/methods/{id}/default:
 *   put:
 *     summary: Set default payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default updated
 */
router.put("/methods/:id/default", setDefaultPaymentMethod);

// ─── Payout Methods ───────────────────────────────────────────

/**
 * @swagger
 * /api/v1/payments/payouts/methods:
 *   get:
 *     summary: Get payout methods
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payout methods
 */
router.get("/payouts/methods", getPayoutMethods);

/**
 * @swagger
 * /api/v1/payments/payouts/methods:
 *   post:
 *     summary: Add a payout method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, label]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MOBILE_MONEY, BANK_TRANSFER]
 *               label:
 *                 type: string
 *               details:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Payout method added
 */
router.post("/payouts/methods", addPayoutMethod);

/**
 * @swagger
 * /api/v1/payments/payouts/methods/{id}:
 *   delete:
 *     summary: Remove a payout method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed
 */
router.delete("/payouts/methods/:id", deletePayoutMethod);

// ─── Payment Intent & Confirmation ───────────────────────────

/**
 * @swagger
 * /api/v1/payments/create-intent:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, currency]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to charge
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g. RWF, USD)
 *               bookingId:
 *                 type: string
 *                 description: Associated booking ID
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method to use
 *     responses:
 *       201:
 *         description: Payment intent created
 *       400:
 *         description: Invalid request data
 */
router.post("/create-intent", createPaymentIntent);

/**
 * @swagger
 * /api/v1/payments/confirm:
 *   post:
 *     summary: Confirm a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentIntentId]
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: ID of the payment intent to confirm
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Payment confirmation failed
 */
router.post("/confirm", confirmPayment);

// ─── History ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get("/history", getPayments);

/**
 * @swagger
 * /api/v1/payments/payouts/history:
 *   get:
 *     summary: Get payout history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history
 */
router.get("/payouts/history", getPayouts);

export default router;
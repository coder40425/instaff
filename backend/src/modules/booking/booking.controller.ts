import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";

import {
  createBooking,
  getCustomerBookings,
  getWorkerBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  completeBooking,
  cancelBooking,
  cancelWorkerBooking,
  markNoShow,
  requestReplacement,
  markBookingPaid,
  customerStartBooking,
  confirmPaymentReceived,
} from "./booking.service";

import { createBookingSchema } from "./booking.validation";

export const createBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const booking = await createBooking(req.user!.userId, data);
    res.status(201).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const myBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await getCustomerBookings(req.user!.userId);
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const workerBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await getWorkerBookings(req.user!.userId);
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const bookingDetails = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await getBookingById(String(req.params.id));
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const acceptBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await acceptBooking(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await rejectBooking(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const customerStartBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await customerStartBooking(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const completeBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await completeBooking(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const cancelBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await cancelBooking(
      String(req.params.id),
      req.user!.userId,
      req.body?.reason
    );
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

export const cancelWorkerBookingHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await cancelWorkerBooking(
      String(req.params.id),
      req.user!.userId,
      req.body?.reason
    );
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

export const markPaidHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await markBookingPaid(String(req.params.id), req.user!.userId, req.body.paymentMethod);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const replacementHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await requestReplacement(String(req.params.id), req.user!.userId, req.body.reason);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const noShowHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await markNoShow(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Worker confirms customer paid via UPI — credits wallet
export const confirmPaymentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await confirmPaymentReceived(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

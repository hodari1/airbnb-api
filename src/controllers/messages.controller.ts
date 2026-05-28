import { Request, Response } from "express";
import prisma from "../prisma";

// Get conversation with a specific user
export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const otherUserId = Array.isArray(req.params.otherUserId)
      ? req.params.otherUserId[0]
      : req.params.otherUserId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark all messages from the other user as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      status: "success",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch conversation" });
  }
};

// Get all conversations (list of users you've messaged)
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get all unique users you've messaged
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      distinct: ["receiverId"],
      select: { receiverId: true },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      distinct: ["senderId"],
      select: { senderId: true },
    });

    const userIds = new Set([
      ...sentMessages.map((m) => m.receiverId),
      ...receivedMessages.map((m) => m.senderId),
    ]);

    const conversations = await Promise.all(
      Array.from(userIds).map(async (otherUserId) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          },
        });

        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: false,
          },
        });

        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId as string },
          select: { id: true, name: true, avatar: true },
        });

        return {
          otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by most recent message
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt || 0).getTime() -
        new Date(a.lastMessage?.createdAt || 0).getTime()
    );

    res.json({
      status: "success",
      data: conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch conversations" });
  }
};

// Send a message
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { receiverId, content, bookingId } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: userId,
        receiverId,
        bookingId: bookingId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.status(201).json({
      status: "success",
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ status: "error", message: "Failed to send message" });
  }
};

// Get unread message count
export const getUnreadMessageCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    res.json({
      status: "success",
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch unread count" });
  }
};

// Mark conversation as read
export const markConversationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const otherUserId = Array.isArray(req.params.otherUserId)
      ? req.params.otherUserId[0]
      : req.params.otherUserId;

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      status: "success",
      message: "Conversation marked as read",
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({ status: "error", message: "Failed to mark as read" });
  }
};

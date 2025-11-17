import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertMessageSchema, insertNotificationSchema, insertSettingsSchema, loginSchema, registerSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(parsed.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email sudah terdaftar" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(parsed.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username sudah digunakan" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(parsed.password, 10);
      
      // Create user
      const user = await storage.createUser({
        email: parsed.email,
        username: parsed.username,
        password: hashedPassword,
      });
      
      // Handle referral code if provided
      if (parsed.referralCode) {
        await storage.completeReferral(parsed.referralCode, user.id);
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, username: user.username, email: user.email, points: user.points } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Registrasi gagal" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(parsed.email);
      if (!user) {
        return res.status(401).json({ error: "Email atau password salah" });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(parsed.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email atau password salah" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ user: { id: user.id, username: user.username, email: user.email, points: user.points } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Login gagal" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout gagal" });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user: { id: user.id, username: user.username, email: user.email, points: user.points } });
  });

  // Messages endpoints
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUserId(req.session.userId!);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const parsed = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(parsed, req.session.userId!);
      
      // Award points for sending a message
      await storage.updateUserPoints(req.session.userId!, 1);
      
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Check-in endpoint
  app.post("/api/checkin", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user already checked in today
      if (user.lastCheckin) {
        const lastCheckin = new Date(user.lastCheckin);
        const today = new Date();
        const isSameDay =
          lastCheckin.getDate() === today.getDate() &&
          lastCheckin.getMonth() === today.getMonth() &&
          lastCheckin.getFullYear() === today.getFullYear();
        
        if (isSameDay) {
          return res.status(400).json({ error: "Already checked in today" });
        }
      }
      
      // Update check-in and award points
      const updatedUser = await storage.updateUserCheckin(user.id);
      
      // Create notification
      await storage.createNotification(
        {
          title: "Daily Check-in Complete!",
          message: "You've earned 10 points! Come back tomorrow for more.",
        },
        user.id
      );
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  // User info endpoint
  app.get("/api/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Leaderboard endpoint
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const limit = 10;
      const leaderboard = await storage.getLeaderboard(page, limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUserId(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const parsed = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(parsed, req.session.userId!);
      res.json(notification);
    } catch (error) {
      res.status(400).json({ error: "Invalid notification data" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNotification(id);
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      let settings = await storage.getSettingsByUserId(req.session.userId!);
      
      // Create default settings if they don't exist
      if (!settings) {
        settings = await storage.createSettings(
          {
            theme: "light",
            notifications: true,
            emailNotifications: false,
          },
          req.session.userId!
        );
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const parsed = insertSettingsSchema.partial().parse(req.body);
      
      let settings = await storage.getSettingsByUserId(req.session.userId!);
      
      if (!settings) {
        // Create if doesn't exist
        settings = await storage.createSettings(
          {
            theme: parsed.theme || "light",
            notifications: parsed.notifications ?? true,
            emailNotifications: parsed.emailNotifications ?? false,
          },
          req.session.userId!
        );
      } else {
        // Update existing
        settings = await storage.updateSettings(req.session.userId!, parsed);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: "Invalid settings data" });
    }
  });

  // Referral endpoints
  app.get("/api/referral", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getReferralStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  app.post("/api/referral/complete", async (req, res) => {
    try {
      const { referralCode, userId } = req.body;
      
      if (!referralCode || !userId) {
        return res.status(400).json({ error: "Missing referral code or user ID" });
      }

      const success = await storage.completeReferral(referralCode, userId);
      
      if (!success) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete referral" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

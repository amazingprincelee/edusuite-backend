import Notification from "../models/notification.js";
import User from "../models/user.js";
import nodemailer from "nodemailer";

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
});

// Get notifications for authenticated user
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, isRead } = req.query;
    
    const query = { recipient: userId };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender', 'name email');
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });
    
    res.status(200).json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Error marking notification as read", error: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error marking all notifications as read", error: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error: error.message });
  }
};

// Create notification (for system use)
export const createNotification = async (req, res) => {
  try {
    const { recipientId, type, title, message, data, sendEmail = false } = req.body;
    const senderId = req.user._id;
    
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      data
    });
    
    await notification.save();
    
    // Send email notification if requested
    if (sendEmail) {
      const recipient = await User.findById(recipientId);
      if (recipient && recipient.email) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: recipient.email,
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">${title}</h2>
              <p>${message}</p>
              <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                  This is an automated message from your School Management System.
                </p>
              </div>
            </div>
          `
        };
        
        try {
          await transporter.sendMail(mailOptions);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
        }
      }
    }
    
    res.status(201).json({ message: "Notification created successfully", notification });
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error: error.message });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('notificationPreferences');
    
    const defaultPreferences = {
      email: {
        results: true,
        announcements: true,
        events: true,
        assignments: true
      },
      inApp: {
        results: true,
        announcements: true,
        events: true,
        assignments: true
      }
    };
    
    const preferences = user.notificationPreferences || defaultPreferences;
    
    res.status(200).json({ preferences });
  } catch (error) {
    res.status(500).json({ message: "Error fetching preferences", error: error.message });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true }
    ).select('notificationPreferences');
    
    res.status(200).json({ 
      message: "Notification preferences updated successfully", 
      preferences: user.notificationPreferences 
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating preferences", error: error.message });
  }
};

// Send bulk notifications (admin only)
export const sendBulkNotifications = async (req, res) => {
  try {
    const { recipients, type, title, message, sendEmail = false } = req.body;
    const senderId = req.user._id;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    
    const notifications = recipients.map(recipientId => ({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message
    }));
    
    const createdNotifications = await Notification.insertMany(notifications);
    
    // Send emails if requested
    if (sendEmail) {
      const users = await User.find({ _id: { $in: recipients } }).select('email name');
      
      const emailPromises = users.map(user => {
        if (user.email) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">${title}</h2>
                <p>Dear ${user.name},</p>
                <p>${message}</p>
                <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    This is an automated message from your School Management System.
                  </p>
                </div>
              </div>
            `
          };
          
          return transporter.sendMail(mailOptions).catch(error => {
            console.error(`Email failed for ${user.email}:`, error);
          });
        }
      });
      
      await Promise.allSettled(emailPromises);
    }
    
    res.status(201).json({ 
      message: "Bulk notifications sent successfully", 
      count: createdNotifications.length 
    });
  } catch (error) {
    res.status(500).json({ message: "Error sending bulk notifications", error: error.message });
  }
};
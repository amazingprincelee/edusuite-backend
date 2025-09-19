import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['result', 'payment', 'event', 'alert', 'info', 'announcement', 'attendance', 'exam', 'general'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    actionUrl: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
    return this.expiresAt && this.expiresAt < new Date();
});

// Static method to create notification with automatic result notifications
notificationSchema.statics.createResultNotification = async function(studentId, resultData) {
    const Student = mongoose.model('Student');
    const student = await Student.findById(studentId).populate('parentId');
    
    if (student && student.parentId) {
        return this.create({
            recipient: student.parentId._id,
            sender: resultData.teacherId,
            type: 'result',
            title: 'New Result Available',
            message: `New ${resultData.examType} results for ${student.fullname} (${student.class}) are now available.`,
            data: {
                studentId: studentId,
                resultId: resultData._id,
                examType: resultData.examType,
                subject: resultData.subject
            },
            priority: 'high',
            actionUrl: '/parent-dashboard/results'
        });
    }
};

// Static method to create payment notifications
notificationSchema.statics.createPaymentNotification = async function(studentId, paymentData) {
    const Student = mongoose.model('Student');
    const student = await Student.findById(studentId).populate('parentId');
    
    if (student && student.parentId) {
        return this.create({
            recipient: student.parentId._id,
            sender: paymentData.adminId,
            type: 'payment',
            title: paymentData.type === 'reminder' ? 'Fee Payment Reminder' : 'Payment Confirmation',
            message: paymentData.message,
            data: {
                studentId: studentId,
                paymentId: paymentData._id,
                amount: paymentData.amount,
                dueDate: paymentData.dueDate
            },
            priority: paymentData.type === 'reminder' ? 'high' : 'medium',
            actionUrl: '/parent-dashboard/payments'
        });
    }
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
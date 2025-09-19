import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    enum: [
      'academic', // Academic events like term start/end, exam periods
      'holiday', // School holidays and breaks
      'exam', // Specific exam dates
      'meeting', // Staff meetings, parent meetings
      'sports', // Sports events and competitions
      'cultural', // Cultural events, celebrations
      'announcement', // General announcements
      'deadline', // Important deadlines
      'other' // Other events
    ],
    required: true,
    default: 'other'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:MM"
    default: "09:00"
  },
  endTime: {
    type: String, // Format: "HH:MM"
    default: "17:00"
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true
  },
  // Who can see this event
  visibility: {
    type: String,
    enum: ['public', 'staff', 'students', 'parents', 'admin'],
    default: 'public'
  },
  // Target audience for the event
  targetAudience: [{
    type: String,
    enum: ['all', 'students', 'teachers', 'parents', 'admin', 'specific_class']
  }],
  // If targeting specific classes
  targetClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassList'
  }],
  // If targeting specific students
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Academic session and term
  academicSession: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['first', 'second', 'third'],
    required: true
  },
  // Event status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  // Recurring event settings
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function() { return this.isRecurring; }
  },
  recurrenceEnd: {
    type: Date,
    required: function() { return this.isRecurring; }
  },
  // Reminder settings
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification', 'sms'],
      default: 'notification'
    },
    timeBeforeEvent: {
      type: Number, // Minutes before event
      default: 60
    },
    sent: {
      type: Boolean,
      default: false
    }
  }],
  // Attachments or related documents
  attachments: [{
    name: String,
    url: String,
    type: String // file type
  }],
  // Event creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Event color for calendar display
  color: {
    type: String,
    default: '#3B82F6' // Blue color
  },
  // Additional metadata
  metadata: {
    examSubject: String, // For exam events
    meetingType: String, // For meeting events
    sportsType: String, // For sports events
    culturalType: String // For cultural events
  },
  // Attendance tracking for events
  attendanceRequired: {
    type: Boolean,
    default: false
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'attended', 'absent'],
      default: 'invited'
    },
    responseDate: Date
  }],
  // Event capacity
  maxAttendees: {
    type: Number
  },
  // Registration required
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: {
    type: Date
  },
  // Event tags for better organization
  tags: [{
    type: String,
    trim: true
  }],
  // Notes for internal use
  internalNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ eventType: 1 });
calendarEventSchema.index({ academicSession: 1, term: 1 });
calendarEventSchema.index({ targetAudience: 1 });
calendarEventSchema.index({ status: 1 });
calendarEventSchema.index({ createdBy: 1 });

// Virtual for event duration
calendarEventSchema.virtual('duration').get(function() {
  return this.endDate - this.startDate;
});

// Virtual for checking if event is active
calendarEventSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'ongoing';
});

// Virtual for checking if event is upcoming
calendarEventSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.startDate > now && this.status === 'scheduled';
});

// Virtual for checking if event is past
calendarEventSchema.virtual('isPast').get(function() {
  const now = new Date();
  return this.endDate < now;
});

// Pre-save middleware to validate dates
calendarEventSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  
  if (this.isRecurring && !this.recurrenceEnd) {
    next(new Error('Recurrence end date is required for recurring events'));
  }
  
  if (this.registrationRequired && !this.registrationDeadline) {
    this.registrationDeadline = new Date(this.startDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before event
  }
  
  next();
});

// Static method to get events for a specific date range
calendarEventSchema.statics.getEventsInRange = function(startDate, endDate, filters = {}) {
  const query = {
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ],
    ...filters
  };
  
  return this.find(query)
    .populate('createdBy', 'fullname email')
    .populate('updatedBy', 'fullname email')
    .populate('targetClasses', 'name')
    .populate('targetStudents', 'firstName surName admissionNumber')
    .sort({ startDate: 1 });
};

// Static method to get upcoming events
calendarEventSchema.statics.getUpcomingEvents = function(limit = 10, filters = {}) {
  const now = new Date();
  return this.find({
    startDate: { $gte: now },
    status: 'scheduled',
    ...filters
  })
    .populate('createdBy', 'fullname email')
    .populate('targetClasses', 'name')
    .sort({ startDate: 1 })
    .limit(limit);
};

// Static method to get events by type
calendarEventSchema.statics.getEventsByType = function(eventType, filters = {}) {
  return this.find({
    eventType,
    ...filters
  })
    .populate('createdBy', 'fullname email')
    .populate('targetClasses', 'name')
    .sort({ startDate: 1 });
};

// Instance method to check if user can view this event
calendarEventSchema.methods.canUserView = function(user, userRole) {
  if (this.visibility === 'public') return true;
  if (this.visibility === 'admin' && userRole === 'admin') return true;
  if (this.visibility === 'staff' && ['admin', 'teacher'].includes(userRole)) return true;
  if (this.visibility === 'students' && userRole === 'student') return true;
  if (this.visibility === 'parents' && userRole === 'parent') return true;
  
  return this.createdBy.toString() === user._id.toString();
};

// Instance method to add attendee
calendarEventSchema.methods.addAttendee = function(userId, status = 'invited') {
  const existingAttendee = this.attendees.find(a => a.user.toString() === userId.toString());
  
  if (existingAttendee) {
    existingAttendee.status = status;
    existingAttendee.responseDate = new Date();
  } else {
    this.attendees.push({
      user: userId,
      status,
      responseDate: new Date()
    });
  }
  
  return this.save();
};

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

export default CalendarEvent;
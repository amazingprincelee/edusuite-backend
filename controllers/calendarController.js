import CalendarEvent from '../models/calendar.js';
import ClassList from '../models/classList.js';
import Student from '../models/student.js';
import mongoose from 'mongoose';

// Create a new calendar event
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      startTime,
      endTime,
      isAllDay,
      location,
      visibility,
      targetAudience,
      targetClasses,
      targetStudents,
      priority,
      academicSession,
      term,
      isRecurring,
      recurrencePattern,
      recurrenceEnd,
      reminders,
      attachments,
      color,
      metadata,
      attendanceRequired,
      maxAttendees,
      registrationRequired,
      registrationDeadline,
      tags,
      internalNotes
    } = req.body;

    // Validate required fields
    if (!title || !startDate || !endDate || !eventType || !academicSession || !term) {
      return res.status(400).json({
        success: false,
        message: 'Title, start date, end date, event type, academic session, and term are required'
      });
    }

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Create new event
    const newEvent = new CalendarEvent({
      title,
      description,
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      isAllDay,
      location,
      visibility,
      targetAudience,
      targetClasses,
      targetStudents,
      priority,
      academicSession,
      term,
      isRecurring,
      recurrencePattern,
      recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : undefined,
      reminders,
      attachments,
      color,
      metadata,
      attendanceRequired,
      maxAttendees,
      registrationRequired,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      tags,
      internalNotes,
      createdBy: req.user._id
    });

    const savedEvent = await newEvent.save();
    
    // Populate references for response
    await savedEvent.populate([
      { path: 'createdBy', select: 'fullname email' },
      { path: 'targetClasses', select: 'name' },
      { path: 'targetStudents', select: 'firstName surName admissionNumber' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: savedEvent
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create calendar event',
      error: error.message
    });
  }
};

// Get all events with filtering and pagination
export const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      eventType,
      academicSession,
      term,
      status,
      visibility,
      startDate,
      endDate,
      targetAudience,
      priority,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (eventType) filter.eventType = eventType;
    if (academicSession) filter.academicSession = academicSession;
    if (term) filter.term = term;
    if (status) filter.status = status;
    if (visibility) filter.visibility = visibility;
    if (targetAudience) filter.targetAudience = { $in: [targetAudience] };
    if (priority) filter.priority = priority;

    // Date range filter
    if (startDate || endDate) {
      filter.$or = [
        {
          startDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        },
        {
          endDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        }
      ];
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Check user permissions for visibility
    if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: req.user.role },
        { createdBy: req.user._id }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await CalendarEvent.find(filter)
      .populate('createdBy', 'fullname email')
      .populate('updatedBy', 'fullname email')
      .populate('targetClasses', 'name')
      .populate('targetStudents', 'firstName surName admissionNumber')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalEvents = await CalendarEvent.countDocuments(filter);
    const totalPages = Math.ceil(totalEvents / parseInt(limit));

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.message
    });
  }
};

// Get events for a specific date range (calendar view)
export const getEventsInRange = async (req, res) => {
  try {
    const { startDate, endDate, view = 'month' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Build filter based on user permissions
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: req.user.role },
        { createdBy: req.user._id }
      ];
    }

    const events = await CalendarEvent.getEventsInRange(
      new Date(startDate),
      new Date(endDate),
      filter
    );

    // Group events by date for easier frontend consumption
    const eventsByDate = {};
    events.forEach(event => {
      const dateKey = event.startDate.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    res.status(200).json({
      success: true,
      data: {
        events,
        eventsByDate,
        view,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching events in range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events in date range',
      error: error.message
    });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    // Build filter based on user permissions
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: req.user.role },
        { createdBy: req.user._id }
      ];
    }

    // Add date filter for upcoming events within specified days
    const now = new Date();
    const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);
    filter.startDate = { $gte: now, $lte: futureDate };
    filter.status = 'scheduled';

    const events = await CalendarEvent.getUpcomingEvents(parseInt(limit), filter);

    res.status(200).json({
      success: true,
      data: events,
      meta: {
        limit: parseInt(limit),
        days: parseInt(days)
      }
    });

  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
      error: error.message
    });
  }
};

// Get single event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await CalendarEvent.findById(id)
      .populate('createdBy', 'fullname email')
      .populate('updatedBy', 'fullname email')
      .populate('targetClasses', 'name')
      .populate('targetStudents', 'firstName surName admissionNumber')
      .populate('attendees.user', 'fullname email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user can view this event
    if (!event.canUserView(req.user, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this event'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permissions - only creator or admin can update
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this event'
      });
    }

    // Validate date range if dates are being updated
    if (updateData.startDate || updateData.endDate) {
      const startDate = new Date(updateData.startDate || event.startDate);
      const endDate = new Date(updateData.endDate || event.endDate);
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Add updatedBy field
    updateData.updatedBy = req.user._id;

    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'fullname email' },
      { path: 'updatedBy', select: 'fullname email' },
      { path: 'targetClasses', select: 'name' },
      { path: 'targetStudents', select: 'firstName surName admissionNumber' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check permissions - only creator or admin can delete
    if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this event'
      });
    }

    await CalendarEvent.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};

// Get events by type
export const getEventsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { academicSession, term, limit = 50 } = req.query;

    const validTypes = ['academic', 'holiday', 'exam', 'meeting', 'sports', 'cultural', 'announcement', 'deadline', 'other'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type'
      });
    }

    // Build filter
    const filter = { eventType: type };
    if (academicSession) filter.academicSession = academicSession;
    if (term) filter.term = term;

    // Add user permission filter
    if (req.user.role !== 'admin') {
      filter.$or = [
        { visibility: 'public' },
        { visibility: req.user.role },
        { createdBy: req.user._id }
      ];
    }

    const events = await CalendarEvent.getEventsByType(type, filter)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: events,
      meta: {
        eventType: type,
        count: events.length
      }
    });

  } catch (error) {
    console.error('Error fetching events by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events by type',
      error: error.message
    });
  }
};

// Add attendee to event
export const addAttendee = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, status = 'invited' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if event has reached max capacity
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: 'Event has reached maximum capacity'
      });
    }

    await event.addAttendee(userId, status);

    res.status(200).json({
      success: true,
      message: 'Attendee added successfully',
      data: event
    });

  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add attendee',
      error: error.message
    });
  }
};

// Update event status
export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await CalendarEvent.findByIdAndUpdate(
      id,
      { status, updatedBy: req.user._id },
      { new: true }
    ).populate('createdBy', 'fullname email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event status updated successfully',
      data: event
    });

  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event status',
      error: error.message
    });
  }
};

// Get calendar statistics
export const getCalendarStats = async (req, res) => {
  try {
    const { academicSession, term } = req.query;

    // Build base filter
    const baseFilter = {};
    if (academicSession) baseFilter.academicSession = academicSession;
    if (term) baseFilter.term = term;

    // Add user permission filter
    if (req.user.role !== 'admin') {
      baseFilter.$or = [
        { visibility: 'public' },
        { visibility: req.user.role },
        { createdBy: req.user._id }
      ];
    }

    const [
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      eventsByType,
      eventsByStatus,
      eventsByPriority
    ] = await Promise.all([
      CalendarEvent.countDocuments(baseFilter),
      CalendarEvent.countDocuments({
        ...baseFilter,
        startDate: { $gte: new Date() },
        status: 'scheduled'
      }),
      CalendarEvent.countDocuments({
        ...baseFilter,
        status: 'ongoing'
      }),
      CalendarEvent.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$eventType', count: { $sum: 1 } } }
      ]),
      CalendarEvent.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      CalendarEvent.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        upcomingEvents,
        ongoingEvents,
        eventsByType,
        eventsByStatus,
        eventsByPriority
      }
    });

  } catch (error) {
    console.error('Error fetching calendar statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar statistics',
      error: error.message
    });
  }
};
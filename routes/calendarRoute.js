import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventsInRange,
  getUpcomingEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByType,
  addAttendee,
  updateEventStatus,
  getCalendarStats
} from '../controllers/calendarController.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Calendar event CRUD operations
router.post('/events', createEvent);                    // Create new event
router.get('/events', getAllEvents);                    // Get all events with filtering
router.get('/events/range', getEventsInRange);          // Get events in date range
router.get('/events/upcoming', getUpcomingEvents);      // Get upcoming events
router.get('/events/stats', getCalendarStats);          // Get calendar statistics
router.get('/events/type/:type', getEventsByType);      // Get events by type
router.get('/events/:id', getEventById);                // Get single event
router.put('/events/:id', updateEvent);                 // Update event
router.delete('/events/:id', deleteEvent);              // Delete event

// Event management operations
router.patch('/events/:id/status', updateEventStatus);  // Update event status
router.post('/events/:id/attendees', addAttendee);      // Add attendee to event

export default router;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Helper functions
const formatDate = (year, month, day) => {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

// Check if a date is in the past
const isDateInPast = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of today
  
  const [year, month, day] = dateString.split('-').map(Number);
  const checkDate = new Date(year, month - 1, day);
  
  return checkDate < today;
};

// Format time for display
const formatTime = (timeString) => {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Simple Modal component
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const CalendarPlanning = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    description: "", 
    startTime: "09:00", 
    endTime: "10:00" 
  });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [eventToView, setEventToView] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eventsForDate, setEventsForDate] = useState([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  // Fetch events from the backend
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/events');
      if (!response.ok) {
        throw new Error(`Error fetching events: ${response.statusText}`);
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (selectedDate && newEvent.title.trim() !== "") {
      // Validate time inputs
      if (newEvent.startTime >= newEvent.endTime) {
        setError("End time must be after start time.");
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const event = {
        date: selectedDate,
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime
      };

      try {
        const response = await fetch('http://localhost:5000/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create event');
        }
        
        const data = await response.json();
        setEvents([...events, data.event]);
        setIsAddEventOpen(false);
        setNewEvent({ 
          title: "", 
          description: "", 
          startTime: "09:00", 
          endTime: "10:00" 
        });
      } catch (error) {
        console.error('Error adding event:', error);
        setError(error.message || 'Failed to add event. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditEvent = async () => {
    if (eventToView && eventToView._id) {
      // Validate time inputs
      if (newEvent.startTime >= newEvent.endTime) {
        setError("End time must be after start time.");
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:5000/api/events/${eventToView._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newEvent.title,
            description: newEvent.description,
            date: selectedDate,
            startTime: newEvent.startTime,
            endTime: newEvent.endTime
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update event');
        }
        
        const data = await response.json();
        setEvents(events.map(event => 
          event._id === eventToView._id ? data.event : event
        ));
        setIsEditEventOpen(false);
        setIsViewEventOpen(false);
        setNewEvent({ 
          title: "", 
          description: "", 
          startTime: "09:00", 
          endTime: "10:00" 
        });
      } catch (error) {
        console.error('Error updating event:', error);
        setError(error.message || 'Failed to update event. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToView || !eventToView._id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventToView._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }
      
      // Filter out the deleted event
      const updatedEvents = events.filter((event) => event._id !== eventToView._id);
      setEvents(updatedEvents);
      
      // Update eventsForDate to reflect the deletion
      const updatedEventsForDate = eventsForDate.filter((event) => event._id !== eventToView._id);
      setEventsForDate(updatedEventsForDate);
      
      // Reset selection if needed
      if (updatedEventsForDate.length === 0) {
        setIsViewEventOpen(false);
      } else {
        // Select another event if available
        setSelectedEventIndex(Math.min(selectedEventIndex, updatedEventsForDate.length - 1));
        setEventToView(updatedEventsForDate[Math.min(selectedEventIndex, updatedEventsForDate.length - 1)]);
      }
      
      setIsDeleteEventOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError(error.message || 'Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const getFirstDayOfMonth = (year, month) => {
    const date = new Date(year, month, 1);
    return date.getDay();
  };

  const handleDateClick = (date) => {
    // Check if the date is in the past
    if (isDateInPast(date)) {
      setError("Cannot add events to past dates.");
      return;
    }
    
    setSelectedDate(date);
    setNewEvent({ 
      title: "", 
      description: "", 
      startTime: "09:00", 
      endTime: "10:00" 
    });
    setIsAddEventOpen(true);
    setIsViewEventOpen(false);
    setIsEditEventOpen(false);
  };

  const handleEventClick = (date) => {
    const dateEvents = events.filter((event) => event.date === date);
    
    if (dateEvents.length > 0) {
      // Sort events by start time
      const sortedEvents = [...dateEvents].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
      
      setEventsForDate(sortedEvents);
      setSelectedEventIndex(0);
      setEventToView(sortedEvents[0]);
      setSelectedDate(date);
      setIsViewEventOpen(true);
      setIsAddEventOpen(false);
      setIsEditEventOpen(false);
    }
  };

  const navigateEvents = (direction) => {
    if (eventsForDate.length <= 1) return;
    
    const newIndex = (selectedEventIndex + direction + eventsForDate.length) % eventsForDate.length;
    setSelectedEventIndex(newIndex);
    setEventToView(eventsForDate[newIndex]);
  };

  const openEditEvent = () => {
    // Check if the selected date is in the past
    if (eventToView && isDateInPast(eventToView.date)) {
      setError("Cannot edit events from past dates.");
      setIsViewEventOpen(false);
      return;
    }
    
    if (eventToView) {
      setNewEvent({
        title: eventToView.title,
        description: eventToView.description,
        startTime: eventToView.startTime || "09:00",
        endTime: eventToView.endTime || "10:00"
      });
      setIsViewEventOpen(false);
      setIsEditEventOpen(true);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const formattedMonth = currentDate.toLocaleString("default", { month: "long" });
  const formattedYear = currentDate.getFullYear();
  const calendarDays = Array(firstDayOfMonth).fill(null).concat(daysInMonth);

  // Group events by date for rendering
  const eventsByDate = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Calendar Planning
      </h2>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow mb-4 flex justify-between items-center">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>{error}</p>
          </div>
          <button 
            className="text-red-700 hover:text-red-800 focus:outline-none" 
            onClick={() => setError(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        {/* Month Navigation */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex space-x-2">
            <button 
              className="flex items-center bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 transition duration-200 disabled:opacity-50" 
              onClick={handlePrevMonth}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <button 
              className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 transition duration-200 disabled:opacity-50" 
              onClick={handleToday}
              disabled={loading}
            >
              Today
            </button>
            <button 
              className="flex items-center bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900 transition duration-200 disabled:opacity-50" 
              onClick={handleNextMonth}
              disabled={loading}
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <h3 className="text-2xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formattedMonth} {formattedYear}
          </h3>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div key={index} className="text-center font-semibold p-3 bg-green-50 text-green-800">{day}</div>
          ))}
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <div key={index} className="bg-gray-100 cursor-default" />
              );
            }
            
            const dateKey = formatDate(formattedYear, currentDate.getMonth() + 1, day);
            const dateEvents = eventsByDate[dateKey] || [];
            const hasEvents = dateEvents.length > 0;
            
            // Check if date is in the past
            const isPastDate = isDateInPast(dateKey);
            
            // Today's date highlighting
            const isToday = new Date().toDateString() === new Date(formattedYear, currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={index}
                className={`${
                  isPastDate 
                    ? "bg-gray-100 cursor-not-allowed"
                    : isToday 
                      ? "bg-green-50 border-l-4 border-green-500 cursor-pointer" 
                      : hasEvents
                        ? "bg-white border-l-4 border-green-500 cursor-pointer"
                        : "bg-white hover:bg-green-50 transition duration-150 cursor-pointer"
                } p-2 min-h-24 relative`}
                onClick={() => !isPastDate && handleDateClick(dateKey)}
              >
                <div className={`text-right mb-1 ${
                  isPastDate 
                    ? "text-gray-400" 
                    : isToday 
                      ? "font-bold text-green-700" 
                      : ""
                }`}>
                  {day}
                </div>
                
                {hasEvents && (
                  <div className="space-y-1 mt-1">
                    {dateEvents.slice(0, 2).map((event, idx) => (
                      <div
                        key={idx}
                        className={`text-xs truncate p-1 rounded-md cursor-pointer transition duration-150 ${
                          isPastDate 
                            ? "bg-gray-200 text-gray-600" 
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(dateKey);
                        }}
                      >
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {event.startTime ? formatTime(event.startTime) : "All day"} - {event.title}
                        </div>
                      </div>
                    ))}
                    {dateEvents.length > 2 && (
                      <div
                        className={`text-xs p-1 rounded-md text-center cursor-pointer transition duration-150 ${
                          isPastDate 
                            ? "bg-gray-300 text-gray-600" 
                            : "bg-green-500 text-white hover:bg-green-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(dateKey);
                        }}
                      >
                        +{dateEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-lg mt-4 text-center text-gray-700">Loading...</p>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      <Modal open={isAddEventOpen} onClose={() => setIsAddEventOpen(false)}>
        <div className="border-b border-gray-200 pb-3 mb-4">
          <h2 className="text-xl font-semibold text-green-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Event
          </h2>
          <p className="text-sm text-gray-500">Date: {selectedDate}</p>
        </div>
        
        <input
          type="text"
          placeholder="Event Title"
          className="w-full mb-3 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        
        <div className="flex space-x-4 mb-3">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
            />
          </div>
        </div>
        
        <textarea
          placeholder="Event Description"
          className="w-full mb-3 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 h-32"
          value={newEvent.description}
          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
        />
        <div className="flex justify-between mt-4">
          <button 
            className="flex items-center bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200" 
            onClick={() => setIsAddEventOpen(false)}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button 
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200 disabled:opacity-50" 
            onClick={handleAddEvent}
            disabled={loading || !newEvent.title.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Event
          </button>
        </div>
      </Modal>

      {/* Edit Event Modal */}
      <Modal open={isEditEventOpen} onClose={() => setIsEditEventOpen(false)}>
        <div className="border-b border-gray-200 pb-3 mb-4">
          <h2 className="text-xl font-semibold text-green-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Event
          </h2>
          <p className="text-sm text-gray-500">Date: {selectedDate}</p>
        </div>
        
        <input
          type="text"
          placeholder="Event Title"
          className="w-full mb-3 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        
        <div className="flex space-x-4 mb-3">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
            />
          </div>
        </div>
        
        <textarea
          placeholder="Event Description"
          className="w-full mb-3 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 h-32"
          value={newEvent.description}
          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
        />
        <div className="flex justify-between mt-4">
          <button 
            className="flex items-center bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200" 
            onClick={() => setIsEditEventOpen(false)}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button 
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200 disabled:opacity-50" 
            onClick={handleEditEvent}
            disabled={loading || !newEvent.title.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Save Changes
          </button>
        </div>
      </Modal>

      {/* View Event Modal */}
      <Modal open={isViewEventOpen} onClose={() => setIsViewEventOpen(false)}>
        {eventToView && (
          <>
            <div className="border-b border-gray-200 pb-3 mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-green-700">{eventToView.title}</h2>
                <p className="text-sm text-gray-500">Date: {eventToView.date}</p>
                {eventToView.startTime && eventToView.endTime && (
                  <p className="text-sm text-gray-500">
                    Time: {formatTime(eventToView.startTime)} - {formatTime(eventToView.endTime)}
                  </p>
                )}
              </div>
              {eventsForDate.length > 1 && (
                <div className="flex space-x-2">
                  <button 
                    className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition duration-200"
                    onClick={() => navigateEvents(-1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    className="bg-gray-200 rounded-full p-2 hover:bg-gray-300 transition duration-200"
                    onClick={() => navigateEvents(1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-700 mb-2">Description:</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{eventToView.description || "No description provided."}</p>
            </div>
            
            <div className="flex justify-between mt-4">
              <button
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-200" 
                onClick={() => setIsDeleteEventOpen(true)}
                disabled={loading || isDateInPast(eventToView.date)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button 
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200" 
                onClick={openEditEvent}
                disabled={loading || isDateInPast(eventToView.date)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteEventOpen} onClose={() => setIsDeleteEventOpen(false)}>
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
          <p className="text-gray-600 mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
          <div className="flex justify-center space-x-4">
            <button 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition duration-200 disabled:opacity-50" 
              onClick={() => setIsDeleteEventOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition duration-200 disabled:opacity-50" 
              onClick={handleDeleteEvent}
              disabled={loading}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CalendarPlanning;
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

// A basic Modal component definition (assuming you didn't provide yours because it's generic,
// if you have a custom one, you can replace this with your actual Modal component import/definition)
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};


const user = JSON.parse(localStorage.getItem('user'));
const userRole = user?.role?.toLowerCase();
console.log(userRole)

// Helper functions (kept as is, assuming they are correct)
const formatDate = (year, month, day) => {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

const isDateInPast = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of today
  
  const [year, month, day] = dateString.split('-').map(Number);
  const checkDate = new Date(year, month - 1, day);
  
  return checkDate < today;
};

const formatTime = (timeString) => {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday

const getMonthName = (monthIndex) => {
  const date = new Date(2000, monthIndex);
  return date.toLocaleString('en-US', { month: 'long' });
};

const CalendarPlanning = () => {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: 'meeting',
    visibility: 'public'
  });
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAsc'); // 'dateAsc', 'dateDesc', 'titleAsc', 'titleDesc'

  // Optimized: Pre-process events into a map for faster lookup in renderCalendarDays
  // This memoizes the mapping, so it only recomputes when 'events' array changes.
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      // Ensure the event date is in YYYY-MM-DD format for map key consistency
      const eventDate = event.date?.split('T')[0] || ''; 
      if (eventDate) { // Only add if date is valid
        if (!map.has(eventDate)) {
          map.set(eventDate, []);
        }
        map.get(eventDate).push(event);
      }
    });
    return map;
  }, [events]);


  // Filter and sort events based on search query and sort order (uses useMemo already)
  const filteredEvents = useMemo(() => {
    let tempEvents = events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortOrder) {
      case 'dateAsc':
        tempEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'dateDesc':
        tempEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'titleAsc':
        tempEvents.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'titleDesc':
        tempEvents.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }
    return tempEvents;
  }, [events, searchQuery, sortOrder]);


  const getApiBaseUrl = () => {
    return localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
  };

  const getEventEndpoint = () => {
    const storedEndpoint = localStorage.getItem("eventEndpoint");
    if (storedEndpoint) return storedEndpoint;
    
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/events`; // Default
  };

  // Fetch events from API
  const fetchEvents = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [
        `${baseUrl}/events`,
        `${baseUrl}/calendar/events`,
        `${baseUrl}/admin/events`, // If admin specific endpoint exists
      ];

      let fetchedData = null;
      let success = false;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Attempting to fetch events from: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 8000
          });

          if (response.status >= 200 && response.status < 300) {
            console.log(`Successfully fetched events from: ${endpoint}`);
            fetchedData = response.data.data || response.data; // Adjust based on API response structure
            success = true;
            localStorage.setItem("eventEndpoint", endpoint); // Store successful endpoint
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }

      if (success && fetchedData) {
        // Ensure fetched events have necessary properties and are in correct format
        const processedEvents = fetchedData.map(event => ({
          ...event,
          date: event.date?.split('T')[0] || '', // Ensure YYYY-MM-DD format
          time: event.time || '00:00', // Default time if missing
          // Ensure 'id' or '_id' for unique keys for React list rendering
          id: event.id || event._id || Math.random().toString(36).substr(2, 9), 
        }));
        setEvents(processedEvents);
        console.log("Events loaded:", processedEvents.length);
      } else {
        setErrorMessage("Failed to fetch events from all known endpoints.");
        setEvents([]); // Clear events on complete failure
      }

    } catch (err) {
      console.error("Error fetching events:", err);
      setErrorMessage("An unexpected error occurred while fetching events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };


  const addEvent = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      // Ensure newEvent.date is in YYYY-MM-DD format before sending
      const eventData = {
        ...newEvent,
        date: newEvent.date, 
        time: newEvent.time || '00:00'
      };

      const eventEndpoint = getEventEndpoint();
      const response = await axios.post(eventEndpoint, eventData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        setSuccessMessage("Event added successfully!");
        fetchEvents(); // Refresh events after adding
        setIsModalOpen(false);
        setNewEvent({ title: '', description: '', date: '', time: '', location: '', type: 'meeting', visibility: 'public' });
      } else {
        setErrorMessage(response.data.message || "Failed to add event.");
      }
    } catch (err) {
      console.error("Error adding event:", err);
      setErrorMessage(err.response?.data?.message || "An error occurred while adding the event.");
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      if (!editEvent || (!editEvent.id && !editEvent._id)) {
        setErrorMessage("No event selected for update.");
        setLoading(false);
        return;
      }

      const eventData = {
        ...editEvent,
        date: editEvent.date,
        time: editEvent.time || '00:00'
      };

      const eventId = editEvent.id || editEvent._id;
      const baseEndpoint = getEventEndpoint();
      
      const possibleEndpoints = [
        `${baseEndpoint}/${eventId}`,
        `${baseEndpoint}/update/${eventId}`,
      ];

      if (userRole === 'administrator' || userRole === 'admin') {
        possibleEndpoints.unshift(
          `${baseEndpoint}/admin/${eventId}`,
          `${baseEndpoint}/admin/update/${eventId}`
        );
      }

      let updateSuccess = false;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        for (const method of ['put', 'patch']) { // Use PUT/PATCH for updates
          try {
            console.log(`Trying ${method.toUpperCase()} ${endpoint}`);
            const response = await axios[method](endpoint, eventData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 8000
            });

            if (response.status >= 200 && response.status < 300) {
              console.log(`Event updated successfully with ${method.toUpperCase()} at:`, endpoint);
              updateSuccess = true;
              break;
            }
          } catch (err) {
            console.warn(`${method.toUpperCase()} ${endpoint} failed:`, err.response?.status, err.response?.data?.message || err.message);
            lastError = err;
            continue;
          }
        }
        if (updateSuccess) break;
      }

      if (updateSuccess) {
        setSuccessMessage("Event updated successfully!");
        fetchEvents(); // Refresh events after updating
        setIsEditModalOpen(false);
        setEditEvent(null);
      } else {
        throw lastError || new Error("All update methods failed.");
      }

    } catch (err) {
      console.error("Error updating event:", err);
      setErrorMessage(err.response?.data?.message || "An error occurred while updating the event.");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      if (!selectedEvent || (!selectedEvent.id && !selectedEvent._id)) {
        setErrorMessage("No event selected for deletion.");
        setLoading(false);
        return;
      }

      const eventId = selectedEvent.id || selectedEvent._id;
      const baseEndpoint = getEventEndpoint();
      
      const possibleEndpoints = [
        `${baseEndpoint}/${eventId}`,
        `${baseEndpoint}/delete/${eventId}`,
      ];

      if (userRole === 'administrator' || userRole === 'admin') {
        possibleEndpoints.unshift(
          `${baseEndpoint}/admin/${eventId}`,
          `${baseEndpoint}/admin/delete/${eventId}`
        );
      }

      let deleteSuccess = false;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying DELETE ${endpoint}`);
          const response = await axios.delete(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 8000
          });

          if (response.status >= 200 && response.status < 300) {
            console.log(`Event deleted successfully from:`, endpoint);
            deleteSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`DELETE ${endpoint} failed:`, err.response?.status, err.response?.data?.message || err.message);
          lastError = err;
          continue;
        }
      }

      if (deleteSuccess) {
        setSuccessMessage("Event deleted successfully!");
        fetchEvents(); // Refresh events after deleting
        setIsDeleteEventOpen(false);
        setSelectedEvent(null);
      } else {
        throw lastError || new Error("All delete methods failed.");
      }

    } catch (err) {
      console.error("Error deleting event:", err);
      setErrorMessage(err.response?.data?.message || "An error occurred while deleting the event.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);


  // Calendar rendering logic
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month); // 0 for Sunday, 1 for Monday

    const days = [];

    // Add empty divs for preceding days of the week
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 w-full"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const fullDate = formatDate(year, month + 1, day); // month + 1 because month is 0-indexed
      const isToday = fullDate === formatDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
      const isInPast = isDateInPast(fullDate);

      // Optimized: Look up events from the pre-processed map (eventsByDate)
      const eventsForDay = eventsByDate.get(fullDate) || []; 
      
      days.push(
        <div
          key={day}
          className={`relative h-28 p-2 border rounded-lg flex flex-col items-start cursor-pointer transition-all duration-200
            ${isToday ? 'bg-green-100 border-green-500' : 'bg-white hover:bg-gray-50'}
            ${isInPast && !isToday ? 'bg-gray-100 text-gray-400' : ''}
            ${eventsForDay.length > 0 ? 'bg-green-50 border-green-300' : ''}
            border-green-200 
          `}
          onClick={() => {
            setSelectedDate(fullDate);
            // Pre-fill new event date if adding from calendar view
            setNewEvent(prev => ({ ...prev, date: fullDate }));
            setIsModalOpen(true);
          }}
        >
          <span className={`text-lg font-semibold mb-1 ${isToday ? 'text-green-700' : ''}`}>
            {day}
          </span>
          {eventsForDay.length > 0 && (
            <div className="flex flex-wrap overflow-hidden h-16 w-full text-xs">
              {eventsForDay.slice(0, 3).map(event => ( // Show up to 3 events directly
                <div 
                  key={event.id || event._id} // Use event.id or _id for unique keys
                  className="bg-green-200 text-green-800 rounded-full px-2 py-0.5 mb-1 mr-1 truncate max-w-full"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening new event modal (which is onClick of parent div)
                    setSelectedEvent(event);
                    setIsEditModalOpen(true); // Open edit modal for existing event
                  }}
                  title={`${event.title} (${formatTime(event.time)})`}
                >
                  {event.title}
                </div>
              ))}
              {eventsForDay.length > 3 && (
                <span className="text-gray-500 ml-1">+{eventsForDay.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {errorMessage && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{errorMessage}</div>}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{successMessage}</div>}
      
      {/* Calendar Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="bg-green-200 text-green-800 px-3 py-1 rounded-md hover:bg-green-300">
            &lt; Prev
          </button>
          <h2 className="text-2xl font-semibold text-green-800">
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </h2>
          <button onClick={handleNextMonth} className="bg-green-200 text-green-800 px-3 py-1 rounded-md hover:bg-green-300">
            Next &gt;
          </button>
        </div>
        
        {/* Days of the Week */}
        <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-600 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Event List Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-green-800">Upcoming Events</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-green-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-green-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="dateAsc">Date (Asc)</option>
              <option value="dateDesc">Date (Desc)</option>
              <option value="titleAsc">Title (Asc)</option>
              <option value="titleDesc">Title (Desc)</option>
            </select>
            {(userRole === 'administrator' || userRole === 'admin') && (
              <button 
                onClick={() => {
                  setNewEvent({ title: '', description: '', date: '', time: '', location: '', type: 'meeting', visibility: 'public' });
                  setIsModalOpen(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
              >
                Add Event
              </button>
            )}
            
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No upcoming events.</div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <div 
                key={event.id || event._id} 
                className="bg-white border border-green-200 rounded-lg p-4 shadow-sm flex justify-between items-center hover:shadow-lg transition"
                onClick={() => {
                  setSelectedEvent(event);
                  setIsEditModalOpen(true);
                }}
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium mr-1">Date:</span> {formatDate(new Date(event.date).getFullYear(), new Date(event.date).getMonth() + 1, new Date(event.date).getDate())} at {formatTime(event.time)} - {event.location}
                  </p>
                </div>
                {(userRole === 'administrator' || userRole === 'admin') && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsEditModalOpen(true); }}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm hover:bg-green-200"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsDeleteEventOpen(true); }}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Add New Event</h3>
        <form onSubmit={(e) => { e.preventDefault(); addEvent(); }}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input type="text" id="title" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" id="date" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
              <input type="time" id="time" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" id="location" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
              <select id="type" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                <option value="meeting">Meeting</option>
                <option value="announcement">Announcement</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">Visibility</label>
              <select id="visibility" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={newEvent.visibility} onChange={(e) => setNewEvent({ ...newEvent, visibility: e.target.value })}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          {loading && <div className="text-center text-green-600 mb-4">Adding event...</div>}
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}

          <div className="flex justify-end space-x-4">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="bg-green-300 text-green-800 px-4 py-2 rounded-md hover:bg-green-400">Cancel</button>
            <button type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Add Event</button>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {editEvent && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Event</h3>
            <form onSubmit={(e) => { e.preventDefault(); updateEvent(); }}>
              <div className="mb-4">
                <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" id="editTitle" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editEvent.title} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="editDescription" rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="editDate" className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" id="editDate" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="editTime" className="block text-sm font-medium text-gray-700">Time</label>
                  <input type="time" id="editTime" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={editEvent.time} onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })} />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="editLocation" className="block text-sm font-medium text-gray-700">Location</label>
                <input type="text" id="editLocation" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editEvent.location} onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="editType" className="block text-sm font-medium text-gray-700">Type</label>
                  <select id="editType" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={editEvent.type} onChange={(e) => setEditEvent({ ...editEvent, type: e.target.value })}>
                    <option value="meeting">Meeting</option>
                    <option value="announcement">Announcement</option>
                    <option value="holiday">Holiday</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="editVisibility" className="block text-sm font-medium text-gray-700">Visibility</label>
                  <select id="editVisibility" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={editEvent.visibility} onChange={(e) => setEditEvent({ ...editEvent, visibility: e.target.value })}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              {loading && <div className="text-center text-green-600 mb-4">Updating event...</div>}
              {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}

              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)}
                  className="bg-green-300 text-green-800 px-4 py-2 rounded-md hover:bg-green-400">Cancel</button>
                <button type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Update Event</button>
              </div>
            </form>
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
          {loading && <div className="text-center text-green-600 mb-4">Deleting event...</div>}
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          <div className="flex justify-center space-x-4">
            <button 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              onClick={() => setIsDeleteEventOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              onClick={() => deleteEvent()}
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
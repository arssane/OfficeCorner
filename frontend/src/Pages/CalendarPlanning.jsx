import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Calendar as CalendarIcon, Clock, MapPin, Link2, Plus, Edit, Trash2, X } from 'lucide-react'; // Import icons

// A basic Modal component definition
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

// Reusable Toast Notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-hide after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const textColor = 'text-white';

  return (
    <div className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg ${bgColor} ${textColor} flex items-center space-x-2 z-[1000]`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white font-bold">&times;</button>
    </div>
  );
};


const user = JSON.parse(localStorage.getItem('user'));
const userRole = user?.role?.toLowerCase();

// Helper functions for formatting dates and times
const formatDateToYYYYMMDD = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeToHHMM = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isDateInPast = (dateString) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateString.split('-').map(Number);
  const checkDate = new Date(year, month - 1, day);
  return checkDate < today;
};

const formatDisplayTime = (timeString) => {
  if (!timeString) return "";
  try {
      let dateObj;
      if (timeString.includes('T') || timeString.includes('Z')) { // ISO string
          dateObj = new Date(timeString);
      } else { // Assume HH:MM format
          const [hours, minutes] = timeString.split(':');
          dateObj = new Date(); // Use current date for time components
          dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
      
      if (isNaN(dateObj.getTime())) {
          console.warn("Invalid date/time string provided to formatTime:", timeString);
          return 'Invalid Time';
      }

      const hour = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;

      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  } catch (e) {
      console.error("Error formatting time:", e);
      return 'Error Time';
  }
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getMonthName = (monthIndex) => new Date(2000, monthIndex).toLocaleString('en-US', { month: 'long' });

const CalendarPlanning = () => {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // Add Event Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Edit Event Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // View Event Details Modal
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false); // Delete Confirmation Modal
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: formatDateToYYYYMMDD(new Date()), // Pre-fill with current date
    startTime: formatTimeToHHMM(new Date()), // Pre-fill with current time
    endTime: '',
    location: '',
    type: 'meeting',
    visibility: 'public',
    link: ''
  });

  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // Used for viewing and deletion
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAsc');
  const [toast, setToast] = useState(null); // For toast notifications

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Optimized: Pre-process events into a map for faster lookup
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const eventDate = event.date?.split('T')[0] || '';
      if (eventDate) {
        if (!map.has(eventDate)) {
          map.set(eventDate, []);
        }
        map.get(eventDate).push(event);
      }
    });
    return map;
  }, [events]);

  // Filter and sort events based on search query and sort order
  const filteredEvents = useMemo(() => {
    let tempEvents = events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    switch (sortOrder) {
      case 'dateAsc':
        tempEvents.sort((a, b) => new Date(a.date + 'T' + (a.startTime || '00:00')) - new Date(b.date + 'T' + (b.startTime || '00:00')));
        break;
      case 'dateDesc':
        tempEvents.sort((a, b) => new Date(b.date + 'T' + (b.startTime || '00:00')) - new Date(a.date + 'T' + (a.startTime || '00:00')));
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
    return `${baseUrl}/events`;
  };

  // Fetch events from API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast("Authentication token not found. Please log in.", "error");
        setLoading(false);
        navigate('/login');
        return;
      }

      const baseUrl = getApiBaseUrl();
      const possibleEndpoints = [
        `${baseUrl}/events`,
        `${baseUrl}/calendar/events`,
        `${baseUrl}/admin/events`,
      ];

      let fetchedData = null;
      let success = false;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000
          });

          if (response.status >= 200 && response.status < 300) {
            fetchedData = response.data.events || response.data.data || response.data;
            success = true;
            localStorage.setItem("eventEndpoint", endpoint);
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${endpoint}:`, err.message);
        }
      }

      if (success && fetchedData && Array.isArray(fetchedData)) {
        const processedEvents = fetchedData.map(event => ({
          ...event,
          date: event.date?.split('T')[0] || '',
          startTime: event.startTime || event.time || '00:00',
          endTime: event.endTime || '',
          id: event.id || event._id || Math.random().toString(36).substr(2, 9),
          link: event.link || '',
          location: event.location || '',
          visibility: event.visibility || 'public',
          type: event.type || 'other',
        }));
        setEvents(processedEvents);
      } else {
        showToast("Failed to fetch events or data format is incorrect.", "error");
        setEvents([]);
      }

    } catch (err) {
      console.error("Error fetching events:", err);
      showToast("An unexpected error occurred while fetching events.", "error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast("Authentication token not found. Please log in.", "error");
        setLoading(false);
        navigate('/login');
        return;
      }

      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        location: newEvent.location,
        type: newEvent.type,
        visibility: newEvent.visibility,
        link: newEvent.link
      };

      const response = await axios.post(getEventEndpoint(), eventData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.status >= 200 && response.status < 300) {
        showToast("Event added successfully!", "success");
        fetchEvents();
        setIsModalOpen(false);
        setNewEvent({ title: '', description: '', date: formatDateToYYYYMMDD(new Date()), startTime: formatTimeToHHMM(new Date()), endTime: '', location: '', type: 'meeting', visibility: 'public', link: '' });
      } else {
        showToast(response.data.message || "Failed to add event.", "error");
      }
    } catch (err) {
      console.error("Error adding event:", err);
      showToast(err.response?.data?.message || "An error occurred while adding the event.", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast("Authentication token not found. Please log in.", "error");
        setLoading(false);
        navigate('/login');
        return;
      }

      if (!editEvent || (!editEvent.id && !editEvent._id)) {
        showToast("No event selected for update.", "error");
        setLoading(false);
        return;
      }

      const eventData = {
        title: editEvent.title,
        description: editEvent.description,
        date: editEvent.date,
        startTime: editEvent.startTime,
        endTime: editEvent.endTime,
        location: editEvent.location,
        type: editEvent.type,
        visibility: editEvent.visibility,
        link: editEvent.link
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
      for (const endpoint of possibleEndpoints) {
        for (const method of ['put', 'patch']) {
          try {
            const response = await axios[method](endpoint, eventData, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              timeout: 8000
            });
            if (response.status >= 200 && response.status < 300) {
              updateSuccess = true;
              break;
            }
          } catch (err) { /* continue to next endpoint/method */ }
        }
        if (updateSuccess) break;
      }

      if (updateSuccess) {
        showToast("Event updated successfully!", "success");
        fetchEvents();
        setIsEditModalOpen(false);
        setEditEvent(null);
      } else {
        showToast("Failed to update event using all known endpoints.", "error");
      }

    } catch (err) {
      console.error("Error updating event:", err);
      showToast(err.response?.data?.message || "An error occurred while updating the event.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast("Authentication token not found. Please log in.", "error");
        setLoading(false);
        navigate('/login');
        return;
      }

      if (!selectedEvent || (!selectedEvent.id && !selectedEvent._id)) {
        showToast("No event selected for deletion.", "error");
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
      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.delete(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000
          });
          if (response.status >= 200 && response.status < 300) {
            deleteSuccess = true;
            break;
          }
        } catch (err) { /* continue to next endpoint */ }
      }

      if (deleteSuccess) {
        showToast("Event deleted successfully!", "success");
        fetchEvents();
        setIsDeleteEventOpen(false);
        setSelectedEvent(null);
      } else {
        showToast("Failed to delete event using all known endpoints.", "error");
      }

    } catch (err) {
      console.error("Error deleting event:", err);
      showToast(err.response?.data?.message || "An error occurred while deleting the event.", "error");
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
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 w-full"></div>);
    }

    for (let day = 1; day <= numDays; day++) {
      const fullDate = formatDateToYYYYMMDD(new Date(year, month, day));
      const isToday = fullDate === formatDateToYYYYMMDD(new Date());
      const isInPast = isDateInPast(fullDate);

      const eventsForDay = eventsByDate.get(fullDate) || [];

      days.push(
        <div
          key={day}
          className={`relative h-28 p-2 border rounded-lg flex flex-col items-start cursor-pointer transition-all duration-200
            ${isToday ? 'bg-green-100 border-green-500' : 'bg-white hover:bg-gray-50'}
            ${isInPast && !isToday ? 'bg-gray-100 text-gray-400' : ''}
            ${eventsForDay.length > 0 ? 'bg-emerald-50 border-emerald-300' : ''}
            border-gray-200 shadow-sm overflow-hidden
          `}
          onClick={() => {
            setSelectedEvent(null); // Clear selected event if clicking on a date
            setNewEvent(prev => ({ ...prev, date: fullDate }));
            setIsModalOpen(true);
          }}
        >
          <span className={`text-lg font-semibold mb-1 ${isToday ? 'text-green-700' : ''}`}>
            {day}
          </span>
          {eventsForDay.length > 0 && (
            <div className="flex flex-col gap-0.5 overflow-hidden w-full text-xs">
              {eventsForDay.slice(0, 2).map(event => ( // Show up to 2 events directly
                <div
                  key={event.id || event._id}
                  className="bg-emerald-200 text-emerald-800 rounded-full px-2 py-0.5 truncate max-w-full hover:bg-emerald-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                    setIsViewModalOpen(true);
                  }}
                  title={`${event.title} (${formatDisplayTime(event.startTime)})`}
                >
                  {event.title}
                </div>
              ))}
              {eventsForDay.length > 2 && (
                <span className="text-gray-500 ml-1">+{eventsForDay.length - 2} more</span>
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
    <div className="min-h-screen bg-gray-50 p-6 font-inter">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition-colors">
            &lt; Prev
          </button>
          <h2 className="text-2xl font-semibold text-gray-800">
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </h2>
          <button onClick={handleNextMonth} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition-colors">
            Next &gt;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-600 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Event List Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-xl font-semibold text-green-800">All Events</h2>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-300 p-2 rounded-md focus:ring-green-500 focus:border-green-500 w-full sm:w-auto"
            >
              <option value="dateAsc">Date (Asc)</option>
              <option value="dateDesc">Date (Desc)</option>
              <option value="titleAsc">Title (Asc)</option>
              <option value="titleDesc">Title (Desc)</option>
            </select>
            {(userRole === 'administrator' || userRole === 'admin') && (
              <button
                onClick={() => {
                  setNewEvent({ title: '', description: '', date: formatDateToYYYYMMDD(new Date()), startTime: formatTimeToHHMM(new Date()), endTime: '', location: '', type: 'meeting', visibility: 'public', link: '' });
                  setIsModalOpen(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition w-full sm:w-auto flex items-center justify-center"
              >
                <Plus size={18} className="mr-2" /> Add Event
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No upcoming events.</div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <div
                key={event.id || event._id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-lg transition cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setIsViewModalOpen(true);
                }}
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-sm text-gray-500 flex items-center">
                    <CalendarIcon size={14} className="mr-1" />
                    {formatDateToYYYYMMDD(event.date)}
                    <Clock size={14} className="ml-3 mr-1" />
                    {formatDisplayTime(event.startTime)} {event.endTime && ` - ${formatDisplayTime(event.endTime)}`}
                    {event.location && (
                      <>
                        <MapPin size={14} className="ml-3 mr-1" />
                        {event.location}
                      </>
                    )}
                  </p>
                </div>
                <div className="mt-3 sm:mt-0 flex flex-wrap gap-2">
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-200 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 size={14} className="mr-1" /> View Link
                    </a>
                  )}
                  {(userRole === 'administrator' || userRole === 'admin') && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditEvent(event); setIsEditModalOpen(true); }}
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm hover:bg-gray-200 flex items-center"
                      >
                        <Edit size={14} className="mr-1" /> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsDeleteEventOpen(true); }}
                        className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200 flex items-center"
                      >
                        <Trash2 size={14} className="mr-1" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Add New Event</h3>
        <form onSubmit={(e) => { e.preventDefault(); addEvent(); }}>
          <div className="mb-3">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input type="text" id="title" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
              value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" rows="2" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
              value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}></textarea>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" id="date" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
              <input type="time" id="startTime" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} required />
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time (Optional)</label>
            <input type="time" id="endTime" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
              value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} />
          </div>
          <div className="mb-3">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" id="location" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
              value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
          </div>
          <div className="mb-4">
            <label htmlFor="link" className="block text-sm font-medium text-gray-700">Event Link (Optional)</label>
            <input type="url" id="link" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
              value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} placeholder="e.g., https://meet.google.com/xyz" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
              <select id="type" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                <option value="meeting">Meeting</option>
                <option value="announcement">Announcement</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">Visibility</label>
              <select id="visibility" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                value={newEvent.visibility} onChange={(e) => setNewEvent({ ...newEvent, visibility: e.target.value })}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? 'Adding...' : 'Add Event'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal open={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEditEvent(null);}}>
        {editEvent && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit Event</h3>
            <form onSubmit={(e) => { e.preventDefault(); updateEvent(); }}>
              <div className="mb-3">
                <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700">Title</label>
                <input type="text" id="editTitle" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  value={editEvent.title} onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="editDescription" rows="2" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  value={editEvent.description} onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="editDate" className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" id="editDate" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="editStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" id="editStartTime" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    value={editEvent.startTime} onChange={(e) => setEditEvent({ ...editEvent, startTime: e.target.value })} required />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="editEndTime" className="block text-sm font-medium text-gray-700">End Time (Optional)</label>
                <input type="time" id="editEndTime" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  value={editEvent.endTime} onChange={(e) => setEditEvent({ ...editEvent, endTime: e.target.value })} />
              </div>
              <div className="mb-3">
                <label htmlFor="editLocation" className="block text-sm font-medium text-gray-700">Location</label>
                <input type="text" id="editLocation" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  value={editEvent.location} onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })} />
              </div>
              <div className="mb-4">
                <label htmlFor="editLink" className="block text-sm font-medium text-gray-700">Event Link (Optional)</label>
                <input type="url" id="editLink" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                  value={editEvent.link} onChange={(e) => setEditEvent({ ...editEvent, link: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label htmlFor="editType" className="block text-sm font-medium text-gray-700">Type</label>
                  <select id="editType" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    value={editEvent.type} onChange={(e) => setEditEvent({ ...editEvent, type: e.target.value })}>
                    <option value="meeting">Meeting</option>
                    <option value="announcement">Announcement</option>
                    <option value="holiday">Holiday</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="editVisibility" className="block text-sm font-medium text-gray-700">Visibility</label>
                  <select id="editVisibility" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    value={editEvent.visibility} onChange={(e) => setEditEvent({ ...editEvent, visibility: e.target.value })}>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => {setIsEditModalOpen(false); setEditEvent(null);}}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
                <button type="submit" disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* View Event Details Modal */}
      <Modal open={isViewModalOpen} onClose={() => {setIsViewModalOpen(false); setSelectedEvent(null);}}>
        {selectedEvent && (
          <div className="relative">
            <button
              onClick={() => {setIsViewModalOpen(false); setSelectedEvent(null);}}
              className="absolute top-0 right-0 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{selectedEvent.title}</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong className="font-medium">Description:</strong> {selectedEvent.description}</p>
              <p className="flex items-center"><CalendarIcon size={14} className="mr-2" />
                <strong className="font-medium">Date:</strong> {formatDateToYYYYMMDD(selectedEvent.date)}
              </p>
              <p className="flex items-center"><Clock size={14} className="mr-2" />
                <strong className="font-medium">Time:</strong> {formatDisplayTime(selectedEvent.startTime)} {selectedEvent.endTime && ` - ${formatDisplayTime(selectedEvent.endTime)}`}
              </p>
              <p className="flex items-center"><MapPin size={14} className="mr-2" />
                <strong className="font-medium">Location:</strong> {selectedEvent.location || 'N/A'}
              </p>
              <p><strong className="font-medium">Type:</strong> {selectedEvent.type}</p>
              <p><strong className="font-medium">Visibility:</strong> {selectedEvent.visibility}</p>
              {selectedEvent.link && (
                <p className="flex items-center">
                  <Link2 size={14} className="mr-2" />
                  <strong className="font-medium">Link:</strong> <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedEvent.link}</a>
                </p>
              )}
            </div>
            {(userRole === 'administrator' || userRole === 'admin') && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setEditEvent(selectedEvent);
                    setIsEditModalOpen(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center"
                >
                  <Edit size={16} className="mr-2" /> Edit Event
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsDeleteEventOpen(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center"
                >
                  <Trash2 size={16} className="mr-2" /> Delete Event
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteEventOpen} onClose={() => setIsDeleteEventOpen(false)}>
        <div className="text-center">
          <Trash2 className="h-12 w-12 mx-auto text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
          <p className="text-gray-600 mb-6">Are you sure you want to delete this event? This action cannot be undone.</p>
          {loading && <div className="text-center text-green-600 mb-4">Deleting event...</div>}
          <div className="flex justify-center space-x-4">
            <button
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
              onClick={() => setIsDeleteEventOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
              onClick={deleteEvent}
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

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Calendar as CalendarIcon, Clock, MapPin, Link2, Plus, Edit, Trash2, X, Users } from 'lucide-react'; // Import icons, added Users

// A basic Modal component definition
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* Increased max-w-md for better content display and added overflow-y-auto */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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

const formatDateDisplay = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    return dateString;
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // View Single Event Details Modal (from list below calendar)
  const [isDailyEventsModalOpen, setIsDailyEventsModalOpen] = useState(false); // New: View Events for a specific day (from calendar click)
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
    link: '',
    assignedTo: '', // Can be employee ID or department ID
  });

  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // Used for viewing and deletion (single event from list)
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // New: Used for viewing events on a specific day (from calendar click)

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAsc');
  const [toast, setToast] = useState(null); // For toast notifications

  // New states for department assignment
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignToType, setAssignToType] = useState('employee'); // 'employee' or 'department'
  const [selectedDepartmentForEvent, setSelectedDepartmentForEvent] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const assignToRef = useRef(null); // Ref for click outside logic

  // State to manage user role, initialized in useEffect
  const [userRole, setUserRole] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Effect to set user role from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserRole(user?.role?.toLowerCase());
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setUserRole(null);
      }
    } else {
      setUserRole(null); // No user found
    }
  }, []); // Empty dependency array means this runs once on mount

  // Effect to handle clicks outside the employee/department dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assignToRef.current && !assignToRef.current.contains(event.target)) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [assignToRef]);

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

  const getEmployeeEndpoint = () => {
    const storedEndpoint = localStorage.getItem("employeeEndpoint");
    return storedEndpoint || `${getApiBaseUrl()}/users`;
  };

  const getDepartmentEndpoint = () => {
    const storedEndpoint = localStorage.getItem("departmentEndpoint");
    return storedEndpoint || `${getApiBaseUrl()}/departments`;
  };

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(getEmployeeEndpoint(), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });

      if (response.status >= 200 && response.status < 300) {
        const employeesData = response.data.users || response.data.data || response.data;
        if (Array.isArray(employeesData)) {
          const processedEmployees = employeesData.map(emp => ({
            _id: emp._id || emp.id,
            id: emp.id || emp._id,
            name: emp.name || emp.username || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
            username: emp.username,
            email: emp.email,
            role: emp.role,
            department: emp.department
          }));
          setEmployees(processedEmployees);
          localStorage.setItem('employees', JSON.stringify(processedEmployees));
        }
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(getDepartmentEndpoint(), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000
      });

      if (response.status >= 200 && response.status < 300) {
        const departmentsData = response.data.departments || response.data.data || response.data;
        if (Array.isArray(departmentsData)) {
          const processedDepartments = departmentsData.map(dept => ({
            _id: dept._id || dept.id,
            id: dept.id || dept._id,
            name: dept.name,
            code: dept.code,
          }));
          setDepartments(processedDepartments);
          localStorage.setItem('departments', JSON.stringify(processedDepartments));
        }
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  // Fetch events, employees, and departments on component mount
  useEffect(() => {
    fetchEvents();
    fetchEmployees();
    fetchDepartments();
  }, []);

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
          assignedTo: event.assignedTo || '' // Ensure assignedTo is present
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
      // Date validation: Cannot add event in the past
      if (isDateInPast(newEvent.date)) {
        showToast("Cannot add an event with a past date.", "error");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        showToast("Authentication token not found. Please log in.", "error");
        setLoading(false);
        navigate('/login');
        return;
      }

      let eventsToCreate = [];

      if (assignToType === 'employee') {
        if (!newEvent.assignedTo) {
          showToast("Please select an employee to assign the event to.", "error");
          setLoading(false);
          return;
        }
        eventsToCreate.push({
          ...newEvent,
          assignedTo: newEvent.assignedTo, // Single employee ID
        });
      } else if (assignToType === 'department') {
        if (!selectedDepartmentForEvent) {
          showToast("Please select a department to assign the event to.", "error");
          setLoading(false);
          return;
        }
        // When assigning to a department, we'll assign the department ID directly
        // This assumes the backend can handle a department ID as an assignee for events.
        eventsToCreate.push({
          ...newEvent,
          assignedTo: selectedDepartmentForEvent, // Assign department ID
        });
      }

      let allEventsSuccess = true;
      for (const eventData of eventsToCreate) {
        try {
          const response = await axios.post(getEventEndpoint(), eventData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          });

          if (!(response.status >= 200 && response.status < 300)) {
            console.error(`Failed to create event for one assignee: ${response.data?.message || response.statusText}`);
            allEventsSuccess = false;
          }
        } catch (err) {
          console.error(`Error creating event for one assignee: ${err.message}`);
          allEventsSuccess = false;
        }
      }

      if (allEventsSuccess) {
        showToast("Event(s) added successfully!", "success");
      } else if (eventsToCreate.length > 0) {
        showToast("Some events were created, but there were errors with others. Check console for details.", "error");
      } else {
        showToast("Failed to create any events. Please check the form and server logs.", "error");
      }

      fetchEvents();
      setIsModalOpen(false);
      setNewEvent({ title: '', description: '', date: formatDateToYYYYMMDD(new Date()), startTime: formatTimeToHHMM(new Date()), endTime: '', location: '', type: 'meeting', visibility: 'public', link: '', assignedTo: '' });
      setEmployeeSearchQuery("");
      setSelectedDepartmentForEvent("");
      setAssignToType('employee');

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

      // Date validation: Cannot set event to a past date
      if (isDateInPast(editEvent.date)) {
        showToast("Cannot set event to a past date.", "error");
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
        link: editEvent.link,
        assignedTo: editEvent.assignedTo, // Ensure assignedTo is passed
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
        setEmployeeSearchQuery(""); // Clear search query on modal close
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
            // New behavior: Clicking a date shows events for that day, not opens add modal
            if (eventsForDay.length > 0) {
              setSelectedDayEvents({ date: fullDate, events: eventsForDay });
              setIsDailyEventsModalOpen(true);
            }
            // If no events, do nothing on click, user should use "Add Event" button
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
                    e.stopPropagation(); // Prevent opening the daily events modal if clicking a specific event
                    setSelectedEvent(event); // Set the single event for the view modal
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

  // Filter employees for dropdown based on search query
  const assignableEmployees = useMemo(() => {
    if (!employeeSearchQuery) return employees.filter(employee => employee.role !== 'Administrator' && employee.role !== 'admin'); // Show all non-admins initially
    const lowerCaseQuery = employeeSearchQuery.toLowerCase();
    return employees.filter(employee =>
      employee.role !== 'Administrator' && employee.role !== 'admin' &&
      (employee.name?.toLowerCase().includes(lowerCaseQuery) ||
       employee.username?.toLowerCase().includes(lowerCaseQuery) ||
       `${employee.name || ''} (${employee.username || ''})`.toLowerCase().includes(lowerCaseQuery))
    );
  }, [employees, employeeSearchQuery]);

  // Helper to get assigned name for display
  const getAssignedToName = (assignedToId) => {
    if (!assignedToId) return "Unassigned";

    const employee = employees.find(emp => (emp._id === assignedToId || emp.id === assignedToId));
    if (employee) {
      return employee.username ? `${employee.name} (${employee.username})` : employee.name;
    }

    const department = departments.find(dept => (dept._id === assignedToId || dept.id === assignedToId));
    if (department) {
      return `Department: ${department.name}`;
    }

    return "Unknown Assignee";
  };

  // Effect to handle modal open/close and set initial states for assignedTo fields
  useEffect(() => {
    if (isModalOpen) {
      setEmployeeSearchQuery("");
      setNewEvent(prev => ({ ...prev, assignedTo: "" }));
      setSelectedDepartmentForEvent("");
      setAssignToType('employee');
    }
    if (isEditModalOpen && editEvent) {
      // Determine if it's an employee or department assignment
      const isAssignedToDepartment = departments.some(dept => (dept._id === editEvent.assignedTo || dept.id === editEvent.assignedTo));
      if (isAssignedToDepartment) {
        setAssignToType('department');
        setSelectedDepartmentForEvent(editEvent.assignedTo);
        setEmployeeSearchQuery(""); // Clear employee search if department
        setEditEvent(prev => ({ ...prev, assignedTo: editEvent.assignedTo })); // Ensure ID is kept
      } else {
        setAssignToType('employee');
        setSelectedDepartmentForEvent("");
        const assignedEmployee = employees.find(emp => (emp._id === editEvent.assignedTo || emp.id === editEvent.assignedTo));
        if (assignedEmployee) {
          setEmployeeSearchQuery(assignedEmployee.username ? `${assignedEmployee.name} (${assignedEmployee.username})` : assignedEmployee.name);
          setEditEvent(prev => ({ ...prev, assignedTo: assignedEmployee._id || assignedEmployee.id }));
        } else {
          // If assignedTo is not a recognized employee, clear the search query and assignedTo
          setEmployeeSearchQuery("");
          setEditEvent(prev => ({ ...prev, assignedTo: "" }));
        }
      }
    }
  }, [isModalOpen, isEditModalOpen, editEvent, employees, departments]);


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
                  setNewEvent({ title: '', description: '', date: formatDateToYYYYMMDD(new Date()), startTime: formatTimeToHHMM(new Date()), endTime: '', location: '', type: 'meeting', visibility: 'public', link: '', assignedTo: '' });
                  setEmployeeSearchQuery("");
                  setSelectedDepartmentForEvent("");
                  setAssignToType('employee');
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
                  {event.assignedTo && (
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Users size={14} className="mr-1" />
                      <strong className="font-medium">Assigned To:</strong> {getAssignedToName(event.assignedTo)}
                    </p>
                  )}
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
                value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} 
                min={formatDateToYYYYMMDD(new Date())} // Prevent past dates
                required />
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

          {/* Assign To Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-green-600"
                  name="assignToType"
                  value="employee"
                  checked={assignToType === 'employee'}
                  onChange={() => {
                    setAssignToType('employee');
                    setSelectedDepartmentForEvent('');
                    setNewEvent(prev => ({ ...prev, assignedTo: "" }));
                    setEmployeeSearchQuery("");
                  }}
                />
                <span className="ml-2 text-gray-700">Employee</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-green-600"
                  name="assignToType"
                  value="department"
                  checked={assignToType === 'department'}
                  onChange={() => {
                    setAssignToType('department');
                    setNewEvent(prev => ({ ...prev, assignedTo: "" }));
                    setEmployeeSearchQuery("");
                  }}
                />
                <span className="ml-2 text-gray-700">Department</span>
              </label>
            </div>
          </div>

          {/* Conditional Assign To Fields */}
          {assignToType === 'employee' && (
            <div className="mb-4 relative" ref={assignToRef}>
              <label htmlFor="assignedToEmployee" className="block text-sm font-medium text-gray-700">Assigned To Employee</label>
              <input
                type="text"
                id="assignedToEmployee"
                placeholder="Search or select employee"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                value={employeeSearchQuery}
                onChange={(e) => {
                  setEmployeeSearchQuery(e.target.value);
                  setShowEmployeeDropdown(true);
                  // Do NOT clear newEvent.assignedTo here immediately.
                  // It should only be set when an item from the dropdown is clicked.
                }}
                onFocus={() => setShowEmployeeDropdown(true)}
              />
              {showEmployeeDropdown && assignableEmployees.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {assignableEmployees.map(employee => (
                    <li
                      key={employee._id || employee.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                      onClick={() => {
                        const displayName = employee.username ? `${employee.name} (${employee.username})` : employee.name;
                        setEmployeeSearchQuery(displayName); // Set display name
                        setNewEvent(prev => ({ ...prev, assignedTo: employee._id || employee.id })); // Set actual ID
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      {employee.name} {employee.username && `(${employee.username})`}
                    </li>
                  ))}
                </ul>
              )}
              {/* Only show "No matching employees found" if there's a query and no matches */}
              {employeeSearchQuery && assignableEmployees.length === 0 && (
                <p className="text-sm text-red-500 mt-2">No matching employees found.</p>
              )}
              {/* Show warning if something is typed but no selection is made */}
              {!newEvent.assignedTo && employeeSearchQuery && assignableEmployees.length > 0 && (
                <p className="text-sm text-amber-600 mt-2">Please select an employee from the dropdown.</p>
              )}
            </div>
          )}

          {assignToType === 'department' && (
            <div className="mb-4">
              <label htmlFor="assignedToDepartment" className="block text-sm font-medium text-gray-700">Assigned To Department</label>
              <select
                id="assignedToDepartment"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500 bg-white"
                value={selectedDepartmentForEvent}
                onChange={(e) => setSelectedDepartmentForEvent(e.target.value)}
                required
              >
                <option value="">Select a Department</option>
                {departments.map(dept => (
                  <option key={dept._id || dept.id} value={dept._id || dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || (assignToType === 'employee' && !newEvent.assignedTo) || (assignToType === 'department' && !selectedDepartmentForEvent)}
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
                    value={editEvent.date} onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })} 
                    min={formatDateToYYYYMMDD(new Date())} // Prevent past dates
                    required />
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

              {/* Assign To Type Selection for Edit Modal */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-green-600"
                      name="editAssignToType"
                      value="employee"
                      checked={assignToType === 'employee'}
                      onChange={() => {
                        setAssignToType('employee');
                        setSelectedDepartmentForEvent('');
                        // Keep current employeeSearchQuery if it matches the current assigned employee
                        const assignedEmployee = employees.find(emp => (emp._id === editEvent.assignedTo || emp.id === editEvent.assignedTo));
                        if (!assignedEmployee) { // Clear if current assigned is not an employee
                          setEmployeeSearchQuery("");
                        }
                      }}
                    />
                    <span className="ml-2 text-gray-700">Employee</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-green-600"
                      name="editAssignToType"
                      value="department"
                      checked={assignToType === 'department'}
                      onChange={() => {
                        setAssignToType('department');
                        setEditEvent(prev => ({ ...prev, assignedTo: selectedDepartmentForEvent }));
                        setEmployeeSearchQuery(""); // Clear employee search when switching to department
                      }}
                    />
                    <span className="ml-2 text-gray-700">Department</span>
                  </label>
                </div>
              </div>

              {assignToType === 'employee' && (
                <div className="mb-4 relative" ref={assignToRef}>
                  <label htmlFor="editAssignedToEmployee" className="block text-sm font-medium text-gray-700">Assigned To Employee</label>
                  <input
                    type="text"
                    id="editAssignedToEmployee"
                    placeholder="Search or select employee"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500"
                    value={employeeSearchQuery}
                    onChange={(e) => {
                      setEmployeeSearchQuery(e.target.value);
                      setShowEmployeeDropdown(true);
                      // Do NOT clear editEvent.assignedTo here immediately.
                      // It should only be set when an item from the dropdown is clicked.
                    }}
                    onFocus={() => setShowEmployeeDropdown(true)}
                  />
                  {showEmployeeDropdown && assignableEmployees.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                      {assignableEmployees.map(employee => (
                        <li
                          key={employee._id || employee.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                          onClick={() => {
                            const displayName = employee.username ? `${employee.name} (${employee.username})` : employee.name;
                            setEmployeeSearchQuery(displayName);
                            setEditEvent(prev => ({ ...prev, assignedTo: employee._id || employee.id }));
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          {employee.name} {employee.username && `(${employee.username})`}
                        </li>
                      ))}
                    </ul>
                  )}
                  {employeeSearchQuery && assignableEmployees.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">No matching employees found.</p>
                  )}
                  {!editEvent.assignedTo && employeeSearchQuery && assignableEmployees.length > 0 && (
                    <p className="text-sm text-amber-600 mt-2">Please select an employee from the dropdown.</p>
                  )}
                </div>
              )}

              {assignToType === 'department' && (
                <div className="mb-4">
                  <label htmlFor="editAssignedToDepartment" className="block text-sm font-medium text-gray-700">Assigned To Department</label>
                  <select
                    id="editAssignedToDepartment"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    value={selectedDepartmentForEvent}
                    onChange={(e) => {
                      setSelectedDepartmentForEvent(e.target.value);
                      setEditEvent(prev => ({ ...prev, assignedTo: e.target.value }));
                    }}
                    required
                  >
                    <option value="">Select a Department</option>
                    {departments.map(dept => (
                      <option key={dept._id || dept.id} value={dept._id || dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => {setIsEditModalOpen(false); setEditEvent(null);}}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
                <button type="submit" disabled={loading || (assignToType === 'employee' && !editEvent.assignedTo) || (assignToType === 'department' && !selectedDepartmentForEvent)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {/* View Single Event Details Modal (from list below calendar) */}
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
              {selectedEvent.assignedTo && (
                    <p className="text-sm text-gray-700 flex items-center">
                      <Users size={14} className="mr-1" />
                      <strong className="font-medium">Assigned To:</strong> {getAssignedToName(selectedEvent.assignedTo)}
                    </p>
                  )}
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

      {/* New: Daily Events List Modal (triggered by clicking a date on the calendar) */}
      <Modal open={isDailyEventsModalOpen} onClose={() => {setIsDailyEventsModalOpen(false); setSelectedDayEvents(null);}}>
        {selectedDayEvents && (
          <div className="relative">
            <button
              onClick={() => {setIsDailyEventsModalOpen(false); setSelectedDayEvents(null);}}
              className="absolute top-0 right-0 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Events on {formatDateDisplay(selectedDayEvents.date)}</h3>
            {selectedDayEvents.events.length === 0 ? (
              <p className="text-gray-600">No events scheduled for this day.</p>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.events.map(event => (
                  <div key={event.id || event._id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h4>
                    <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {formatDisplayTime(event.startTime)} {event.endTime && ` - ${formatDisplayTime(event.endTime)}`}
                      {event.location && (
                        <>
                          <MapPin size={14} className="ml-3 mr-1" />
                          {event.location}
                        </>
                      )}
                    </p>
                    {event.assignedTo && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Users size={14} className="mr-1" />
                        <strong className="font-medium">Assigned To:</strong> {getAssignedToName(event.assignedTo)}
                      </p>
                    )}
                    {event.link && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Link2 size={14} className="mr-1" />
                        <strong className="font-medium">Link:</strong> <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{event.link}</a>
                      </p>
                    )}
                    {(userRole === 'administrator' || userRole === 'admin') && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setIsDailyEventsModalOpen(false); // Close this modal
                            setEditEvent(event); // Set the specific event for editing
                            setIsEditModalOpen(true); // Open edit modal
                          }}
                          className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm hover:bg-gray-200 flex items-center"
                        >
                          <Edit size={14} className="mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            setIsDailyEventsModalOpen(false); // Close this modal
                            setSelectedEvent(event); // Set the specific event for deletion
                            setIsDeleteEventOpen(true); // Open delete confirmation
                          }}
                          className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200 flex items-center"
                        >
                          <Trash2 size={14} className="mr-1" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {setIsDailyEventsModalOpen(false); setSelectedDayEvents(null);}}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
              >
                Close
              </button>
            </div>
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

// import React, { useState } from "react";
// import { Dialog } from "@headlessui/react";

// const CalendarPlanning = () => {
//   const [events, setEvents] = useState([]);
//   const [selectedDate, setSelectedDate] = useState(null);
//   const [newEvent, setNewEvent] = useState({ title: "", description: "" });
//   const [isAddEventOpen, setIsAddEventOpen] = useState(false);
//   const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
//   const [isViewEventOpen, setIsViewEventOpen] = useState(false);
//   const [eventToView, setEventToView] = useState(null);
//   const [currentDate, setCurrentDate] = useState(new Date());

//   const handleAddEvent = () => {
//     if (selectedDate && newEvent.title.trim() !== "") {
//       const event = {
//         id: Date.now(),
//         date: selectedDate,
//         title: newEvent.title,
//         description: newEvent.description,
//       };
//       setEvents([...events, event]);
//       setIsAddEventOpen(false);
//       setNewEvent({ title: "", description: "" });
//     }
//   };

//   const handleDeleteEvent = () => {
//     setEvents(events.filter((event) => event.date !== selectedDate));
//     setIsDeleteEventOpen(false);
//     setIsViewEventOpen(false);
//   };

//   const getDaysInMonth = (year, month) => {
//     const daysInMonth = new Date(year, month, 0).getDate();
//     return Array.from({ length: daysInMonth }, (_, i) => i + 1);
//   };

//   const getFirstDayOfMonth = (year, month) => {
//     const date = new Date(year, month, 1);
//     return date.getDay();
//   };

//   const handleDateClick = (date) => {
//     setSelectedDate(date);
//     setIsAddEventOpen(true);
//     setIsViewEventOpen(false);
//   };

//   const handleEventClick = (date) => {
//     const foundEvent = events.find((event) => event.date === date);
//     if (foundEvent) {
//       setEventToView(foundEvent);
//       setSelectedDate(date);
//       setIsViewEventOpen(true);
//       setIsAddEventOpen(false);
//     }
//   };

//   const handlePrevMonth = () => {
//     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
//   };

//   const handleNextMonth = () => {
//     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
//   };

//   const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
//   const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
//   const formattedMonth = currentDate.toLocaleString("default", { month: "long" });
//   const formattedYear = currentDate.getFullYear();
//   const calendarDays = Array(firstDayOfMonth).fill(null).concat(daysInMonth);

//   return (
//     <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
//       <h2 className="text-2xl font-semibold text-gray-800 mb-4">Calendar Planning</h2>

//       {/* Month Navigation */}
//       <div className="flex justify-between items-center mb-4">
//         <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handlePrevMonth}>
//           Prev
//         </button>
//         <h3 className="text-xl font-semibold">
//           {formattedMonth} {formattedYear}
//         </h3>
//         <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handleNextMonth}>
//           Next
//         </button>
//       </div>

//       {/* Calendar Grid */}
//       <div className="grid grid-cols-7 gap-2">
//         {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
//           <div key={index} className="text-center font-semibold">{day}</div>
//         ))}
//         {calendarDays.map((day, index) => {
//           const dateKey = `${formattedYear}-${currentDate.getMonth() + 1}-${day}`;
//           const eventExists = events.some((event) => event.date === dateKey);

//           return (
//             <div
//               key={index}
//               className={`cursor-pointer p-4 bg-white border rounded hover:bg-gray-200 text-center ${day ? "" : "text-gray-300"}`}
//               onClick={() => day && handleDateClick(dateKey)}
//             >
//               {day || ""}
//               {eventExists && (
//                 <div
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleEventClick(dateKey);
//                   }}
//                   className="mt-2 text-sm text-blue-500 hover:underline cursor-pointer"
//                 >
//                   View Event
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>

//       {/* Add Event Modal */}
//       <Dialog open={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//         <div className="bg-white p-6 rounded-lg shadow-lg w-96">
//           <h2 className="text-xl font-semibold mb-4">Add Event for {selectedDate}</h2>
//           <input
//             type="text"
//             placeholder="Event Title"
//             className="w-full mb-2 p-2 border rounded"
//             value={newEvent.title}
//             onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
//           />
//           <textarea
//             placeholder="Event Description"
//             className="w-full mb-2 p-2 border rounded"
//             value={newEvent.description}
//             onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
//           />
//           <div className="flex justify-between mt-4">
//             <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsAddEventOpen(false)}>
//               Cancel
//             </button>
//             <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handleAddEvent}>
//               Add Event
//             </button>
//           </div>
//         </div>
//       </Dialog>

//       {/* View Event Modal */}
//       <Dialog open={isViewEventOpen} onClose={() => setIsViewEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//         <div className="bg-white p-6 rounded-lg shadow-lg w-96">
//           <h2 className="text-xl font-semibold mb-4">Event Details</h2>
//           {eventToView && (
//             <>
//               <h3 className="text-lg font-bold">{eventToView.title}</h3>
//               <p className="mt-2 text-gray-700">{eventToView.description}</p>
//               <p className="mt-1 text-sm text-gray-500">Date: {eventToView.date}</p>
//               <div className="flex justify-between mt-4">
//                 <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsViewEventOpen(false)}>
//                   Close
//                 </button>
//                 <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600" onClick={() => setIsDeleteEventOpen(true)}>
//                   Delete Event
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </Dialog>

//       {/* Delete Event Modal */}
//       <Dialog open={isDeleteEventOpen} onClose={() => setIsDeleteEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//         <div className="bg-white p-6 rounded-lg shadow-lg w-96">
//           <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
//           <p>Are you sure you want to delete this event?</p>
//           <div className="flex justify-between mt-4">
//             <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsDeleteEventOpen(false)}>
//               Cancel
//             </button>
//             <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600" onClick={handleDeleteEvent}>
//               Delete
//             </button>
//           </div>
//         </div>
//       </Dialog>
//     </div>
//   );
// };

// export default CalendarPlanning;

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";

// Helper functions
const formatDate = (year, month, day) => {
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

// const sendEmailNotification = async (event) => {
//   try {
//     await fetch('/api/send-notification', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         date: event.date,
//         title: event.title,
//         description: event.description,
//       }),
//     });
//   } catch (error) {
//     console.error('Error sending email notification:', error);
//   }
// };


const CalendarPlanning = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "" });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [eventToView, setEventToView] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch events from the backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        if (response.ok) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  const handleAddEvent = async () => {
    if (selectedDate && newEvent.title.trim() !== "") {
      const event = {
        date: selectedDate,
        title: newEvent.title,
        description: newEvent.description,
      };

      try {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });
        const data = await response.json();
        if (response.ok) {
          setEvents([...events, data.event]);
          setIsAddEventOpen(false);
          setNewEvent({ title: "", description: "" });
        } else {
          console.error('Error creating event:', data.message);
        }
      } catch (error) {
        console.error('Error adding event:', error);
      }
    }
  };

  const handleDeleteEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventToView._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setEvents(events.filter((event) => event._id !== eventToView._id));
        setIsDeleteEventOpen(false);
        setIsViewEventOpen(false);
      } else {
        console.error('Error deleting event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
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
    setSelectedDate(date);
    setIsAddEventOpen(true);
    setIsViewEventOpen(false);
  };

  const handleEventClick = (date) => {
    const foundEvent = events.find((event) => event.date === date);
    if (foundEvent) {
      setEventToView(foundEvent);
      setSelectedDate(date);
      setIsViewEventOpen(true);
      setIsAddEventOpen(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const formattedMonth = currentDate.toLocaleString("default", { month: "long" });
  const formattedYear = currentDate.getFullYear();
  const calendarDays = Array(firstDayOfMonth).fill(null).concat(daysInMonth);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Calendar Planning</h2>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handlePrevMonth}>
          Prev
        </button>
        <h3 className="text-xl font-semibold">
          {formattedMonth} {formattedYear}
        </h3>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handleNextMonth}>
          Next
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
          <div key={index} className="text-center font-semibold">{day}</div>
        ))}
        {calendarDays.map((day, index) => {
          const dateKey = day ? formatDate(formattedYear, currentDate.getMonth() + 1, day) : null;
          const eventExists = events.some((event) => event.date === dateKey);

          return (
            <div
              key={index}
              className={`cursor-pointer p-4 bg-white border rounded hover:bg-gray-200 text-center ${day ? "" : "text-gray-300"}`}
              onClick={() => day && handleDateClick(dateKey)}
            >
              {day || ""}
              {eventExists && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(dateKey);
                  }}
                  className="mt-2 text-sm text-blue-500 hover:underline cursor-pointer"
                >
                  View Event
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Event Modal */}
      <Dialog open={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Add Event for {selectedDate}</h2>
          <input
            type="text"
            placeholder="Event Title"
            className="w-full mb-2 p-2 border rounded"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <textarea
            placeholder="Event Description"
            className="w-full mb-2 p-2 border rounded"
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          />
          <div className="flex justify-between mt-4">
            <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsAddEventOpen(false)}>
              Cancel
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={handleAddEvent}>
              Add Event
            </button>
          </div>
        </div>
      </Dialog>

      {/* View Event Modal */}
      <Dialog open={isViewEventOpen} onClose={() => setIsViewEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Event Details</h2>
          {eventToView && (
            <>
              <h3 className="text-lg font-bold">{eventToView.title}</h3>
              <p className="mt-2 text-gray-700">{eventToView.description}</p>
              <p className="mt-1 text-sm text-gray-500">Date: {eventToView.date}</p>
              <div className="flex justify-between mt-4">
                <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsViewEventOpen(false)}>
                  Close
                </button>
                <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600" onClick={() => setIsDeleteEventOpen(true)}>
                  Delete Event
                </button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Delete Event Modal */}
      <Dialog open={isDeleteEventOpen} onClose={() => setIsDeleteEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
          <p>Are you sure you want to delete this event?</p>
          <div className="flex justify-between mt-4">
            <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600" onClick={() => setIsDeleteEventOpen(false)}>
              Cancel
            </button>
            <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600" onClick={handleDeleteEvent}>
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CalendarPlanning;



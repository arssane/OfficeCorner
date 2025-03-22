import React, { useState } from "react";
import { Dialog } from "@headlessui/react";

const CalendarPlanning = () => {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", description: "" });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [eventToView, setEventToView] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleAddEvent = () => {
    if (selectedDate) {
      const event = {
        id: Date.now(),
        date: selectedDate,
        title: newEvent.title,
        description: newEvent.description,
      };
      setEvents([...events, event]);
      setIsAddEventOpen(false);
      setNewEvent({ title: "", description: "" });
    }
  };

  const handleDeleteEvent = () => {
    setEvents(events.filter((event) => event.date !== selectedDate));
    setIsDeleteEventOpen(false);
  };

  const getDaysInMonth = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const getFirstDayOfMonth = (year, month) => {
    const date = new Date(year, month, 1);
    return date.getDay(); // returns 0 for Sunday, 1 for Monday, etc.
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setIsAddEventOpen(true);
    setIsViewEventOpen(false); // Close view event when adding a new event
  };

  const handleEventClick = (date) => {
    setEventToView(events.find((event) => event.date === date));
    setIsViewEventOpen(true);
    setIsAddEventOpen(false); // Close add event when viewing an event
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

  // Create an array for the grid, filling in empty slots for days before the 1st
  const calendarDays = Array(firstDayOfMonth).fill(null).concat(daysInMonth);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Calendar Planning</h2>

      {/* Month and Year Display */}
      <div className="flex justify-between items-center mb-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handlePrevMonth}
        >
          Prev
        </button>
        <h3 className="text-xl font-semibold">
          {formattedMonth} {formattedYear}
        </h3>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={handleNextMonth}
        >
          Next
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
          <div key={index} className="text-center font-semibold">{day}</div>
        ))}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`cursor-pointer p-4 bg-white border rounded hover:bg-gray-200 text-center ${day ? '' : 'text-gray-300'}`}
            onClick={() => day && handleDateClick(`${formattedYear}-${currentDate.getMonth() + 1}-${day}`)} // Handle Date click
          >
            {day || ''}
            <div
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the onClick for the calendar day
                day && handleEventClick(`${formattedYear}-${currentDate.getMonth() + 1}-${day}`);
              }}
              className="mt-2 text-sm text-blue-500 hover:underline cursor-pointer"
            >
              {events.some((event) => event.date === `${formattedYear}-${currentDate.getMonth() + 1}-${day}`) && "View Event"}
            </div>
          </div>
        ))}
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
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
              onClick={() => setIsAddEventOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleAddEvent}
            >
              Add Event
            </button>
          </div>
        </div>
      </Dialog>

      {/* View Event Modal */}
      <Dialog open={isViewEventOpen} onClose={() => setIsViewEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">{eventToView?.title}</h2>
          <p className="text-gray-600">{eventToView?.description}</p>
          <div className="flex justify-end mt-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
              onClick={() => setIsViewEventOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete Event Confirmation Modal */}
      <Dialog open={isDeleteEventOpen} onClose={() => setIsDeleteEventOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Delete Event for {selectedDate}</h2>
          <p>Are you sure you want to delete this event?</p>
          <div className="flex justify-between mt-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
              onClick={() => setIsDeleteEventOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={handleDeleteEvent}
            >
              Delete Event
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CalendarPlanning;

import React, { useState } from 'react';
import { Calendar, Clock, BarChart3, CheckCircle, Camera, BellRing, LogOut } from 'lucide-react';

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([
    { date: 'Mar 21, 2025', timeIn: '08:52 AM', timeOut: '05:07 PM', status: 'Present' },
    { date: 'Mar 20, 2025', timeIn: '09:05 AM', timeOut: '05:15 PM', status: 'Present' },
    { date: 'Mar 19, 2025', timeIn: '08:48 AM', timeOut: '05:03 PM', status: 'Present' },
    { date: 'Mar 18, 2025', timeIn: '-', timeOut: '-', status: 'Vacation' },
    { date: 'Mar 17, 2025', timeIn: '08:59 AM', timeOut: '04:58 PM', status: 'Present' },
  ]);
  
  // Sample data
  const tasks = [
    { id: 1, title: 'Complete quarterly report', dueDate: 'Mar 25, 2025', priority: 'High', status: 'In Progress' },
    { id: 2, title: 'Review client proposal', dueDate: 'Mar 24, 2025', priority: 'Medium', status: 'Pending' },
    { id: 3, title: 'Team meeting preparation', dueDate: 'Mar 22, 2025', priority: 'High', status: 'In Progress' },
    { id: 4, title: 'Update documentation', dueDate: 'Mar 29, 2025', priority: 'Low', status: 'Pending' },
    { id: 5, title: 'Submit expense reports', dueDate: 'Mar 23, 2025', priority: 'Medium', status: 'Completed' },
  ];
  
  const events = [
    { id: 1, title: 'Team Meeting', date: 'Mar 22, 2025', time: '10:00 AM - 11:00 AM', location: 'Conference Room A' },
    { id: 2, title: 'Project Kickoff', date: 'Mar 24, 2025', time: '02:00 PM - 03:30 PM', location: 'Main Office' },
    { id: 3, title: 'Client Presentation', date: 'Mar 25, 2025', time: '11:00 AM - 12:30 PM', location: 'Virtual' },
    { id: 4, title: 'Department Lunch', date: 'Mar 26, 2025', time: '12:30 PM - 01:30 PM', location: 'Cafeteria' },
    { id: 5, title: 'Training Session', date: 'Mar 28, 2025', time: '09:00 AM - 12:00 PM', location: 'Training Room' },
  ];

  // Mock scanning a barcode
  const handleScan = () => {
    setShowScanner(true);
    setTimeout(() => {
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      // Check if we have an entry for today
      const todayEntry = attendanceHistory.find(entry => entry.date === today);
      
      if (!todayEntry) {
        // Clock in - new day
        const newAttendance = [
          { date: today, timeIn: currentTime, timeOut: '-', status: 'Present' },
          ...attendanceHistory
        ];
        setAttendanceHistory(newAttendance);
        setScanStatus({ success: true, message: `Clocked In: ${currentTime}` });
      } else if (todayEntry.timeOut === '-') {
        // Clock out
        const updatedHistory = attendanceHistory.map(entry => 
          entry.date === today ? { ...entry, timeOut: currentTime } : entry
        );
        setAttendanceHistory(updatedHistory);
        setScanStatus({ success: true, message: `Clocked Out: ${currentTime}` });
      } else {
        // Already clocked in and out
        setScanStatus({ success: false, message: "You've already completed attendance for today" });
      }
      
      // Hide scanner after scanning
      setTimeout(() => {
        setShowScanner(false);
        // Clear status after a few seconds
        setTimeout(() => setScanStatus(null), 3000);
      }, 1500);
    }, 1500);
  };

  // Handle logout
  const handleLogout = () => {
    alert("Logging out...");
    // In a real app, you'd handle actual logout logic here
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  
  // Generate calendar days grid
  const generateCalendarDays = () => {
    const days = [];
    const eventDays = events.map(event => event.date);
    
    // Get current month days
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `Mar ${i}, 2025`;
      const hasEvent = eventDays.includes(dateStr);
      const isToday = i === currentDate.getDate();
      
      days.push(
        <div 
          key={i} 
          className={`h-12 flex flex-col justify-center items-center rounded-md cursor-pointer hover:bg-gray-100
            ${isToday ? 'bg-blue-100 font-bold text-blue-600' : ''}
            ${hasEvent ? 'border-2 border-blue-400' : ''}
          `}
        >
          <span>{i}</span>
          {hasEvent && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="bg-gray-100 p-6 rounded-lg max-w-6xl mx-auto">
      {/* Header with Date, Clock In/Out Button, and Logout Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Employee Dashboard</h1>
          <p className="text-gray-500">{today}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleScan}
            className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <Camera size={18} />
            <span>Scan Barcode for Attendance</span>
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Overlay */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-10">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Scanning Barcode...</h2>
            <div className="relative h-48 bg-gray-200 rounded-md mb-4 overflow-hidden">
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-red-500 animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={64} className="text-gray-400" />
              </div>
            </div>
            <p className="text-center text-gray-600">Please hold your barcode up to the scanner</p>
          </div>
        </div>
      )}

      {/* Scan Status Notification */}
      {scanStatus && (
        <div className={`mb-4 p-4 rounded-md ${scanStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {scanStatus.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`pb-2 px-1 ${activeTab === 'tasks' ? 'border-b-2 border-green-900 text-green-900 font-medium' : 'text-gray-500'}`}
          >
            My Tasks
          </button>
          <button 
            onClick={() => setActiveTab('attendance')} 
            className={`pb-2 px-1 ${activeTab === 'attendance' ? 'border-b-2 border-green-900 text-green-900 font-medium' : 'text-gray-500'}`}
          >
            Attendance
          </button>
          <button 
            onClick={() => setActiveTab('calendar')} 
            className={`pb-2 px-1 ${activeTab === 'calendar' ? 'border-b-2 border-green-900 text-green-900 font-medium' : 'text-gray-500'}`}
          >
            Calendar & Events
          </button>
        </div>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">My Tasks</h2>
            <div className="flex space-x-2">
              <select className="border rounded-md px-3 py-1 text-sm bg-white">
                <option>All Tasks</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
              <select className="border rounded-md px-3 py-1 text-sm bg-white">
                <option>All Priorities</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td className="py-4 px-4 text-sm text-gray-900">{task.title}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{task.dueDate}</td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <div className="flex space-x-2">
                        <button className="text-green-900 hover:text-green-700">
                          View
                        </button>
                        {task.status !== 'Completed' && (
                          <button className="text-green-900 hover:text-green-700">
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Attendance Records</h2>
            <div>
              <button 
                onClick={handleScan}
                className="bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-md flex items-center space-x-2"
              >
                <Camera size={18} />
                <span>Scan Now</span>
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-2">How to Record Attendance</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Click the "Scan Barcode" button at the top of the page</li>
              <li>Hold your employee ID barcode in front of the camera</li>
              <li>The system will automatically register your time in/out</li>
              <li>Scan once at the beginning of your shift and once at the end</li>
            </ol>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendanceHistory.map((record, index) => (
                  <tr key={index}>
                    <td className="py-4 px-4 text-sm text-gray-900">{record.date}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{record.timeIn}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{record.timeOut}</td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                          record.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'}`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Calendar & Events</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-md hover:bg-gray-100">
                <Calendar size={18} />
              </button>
              <select className="border rounded-md px-3 py-1 text-sm bg-white">
                <option>March 2025</option>
                <option>April 2025</option>
                <option>May 2025</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="font-medium text-gray-500">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {generateCalendarDays()}
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {events.map(event => (
                  <div key={event.id} className="p-3 border rounded-md hover:bg-gray-50">
                    <div className="flex items-start space-x-2">
                      <div className="bg-green-100 text-green-800 p-2 rounded-md">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-gray-500">{event.date} • {event.time}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
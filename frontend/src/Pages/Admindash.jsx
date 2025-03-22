// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import recruitment from "../assets/recruitment.png";
// import task from "../assets/task.png";
// import attendance from "../assets/attendance.png";
// import calendar from "../assets/calendar.png";
// import pay from "../assets/pay.png";
// import chat from "../assets/chat.png";
// import EmployeeManagement from "./EmployeeManagement";
// import TaskManagement from "./TaskManagement";
// import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";

// const AttendanceTracking = () => <div>Track employee attendance here.</div>;
// const PayrollManagement = () => <div>Manage employee salaries and payroll here.</div>;
// const Chat = () => <div>Communicate with employees here.</div>;

// // Modern Calendar Component
// const CalendarPlanning = ({ onBack }) => {
//   const [currentDate, setCurrentDate] = useState(new Date());
//   const [selectedDate, setSelectedDate] = useState(new Date());
  
//   // Sample events
//   const [events, setEvents] = useState([
//     {
//       id: 1,
//       title: "Weekly Team Meeting",
//       date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15),
//       type: "meeting"
//     },
//     {
//       id: 2,
//       title: "Project Deadline",
//       date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22),
//       type: "deadline"
//     },
//     {
//       id: 3,
//       title: "Performance Reviews",
//       date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8),
//       type: "review"
//     }
//   ]);

//   const onDateClick = (day) => {
//     setSelectedDate(day);
//   };

//   const nextMonth = () => {
//     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
//   };

//   const prevMonth = () => {
//     setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
//   };

//   const renderHeader = () => {
//     const dateFormat = "MMMM yyyy";
//     return (
//       <div className="flex items-center justify-between p-4 bg-white border-b">
//         <button
//           onClick={prevMonth}
//           className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//             <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//           </svg>
//         </button>
//         <h2 className="text-xl font-semibold text-gray-800">
//           {format(currentDate, dateFormat)}
//         </h2>
//         <button
//           onClick={nextMonth}
//           className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//             <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//           </svg>
//         </button>
//       </div>
//     );
//   };

//   const renderDays = () => {
//     const dateFormat = "EEE";
//     const days = [];
//     let startDate = startOfWeek(currentDate);

//     for (let i = 0; i < 7; i++) {
//       days.push(
//         <div key={i} className="w-full py-2 text-center text-sm font-medium text-gray-600">
//           {format(addDays(startDate, i), dateFormat)}
//         </div>
//       );
//     }
//     return <div className="grid grid-cols-7 bg-gray-50">{days}</div>;
//   };

//   const renderCells = () => {
//     const monthStart = startOfMonth(currentDate);
//     const monthEnd = endOfMonth(monthStart);
//     const startDate = startOfWeek(monthStart);
//     const endDate = endOfWeek(monthEnd);

//     const dateFormat = "d";
//     const rows = [];
//     let days = [];
//     let day = startDate;
//     let formattedDate = "";

//     while (day <= endDate) {
//       for (let i = 0; i < 7; i++) {
//         formattedDate = format(day, dateFormat);
//         const cloneDay = day;
        
//         // Check if this day has events
//         const dayEvents = events.filter(event => 
//           isSameDay(event.date, day)
//         );
        
//         const hasEvents = dayEvents.length > 0;
        
//         days.push(
//           <div
//             key={day.toString()}
//             className={`relative h-24 border border-gray-200 p-1 transition-all duration-200
//               ${!isSameMonth(day, monthStart) ? "bg-gray-100 text-gray-400" : "bg-white"}
//               ${isSameDay(day, selectedDate) ? "border-green-500 border-2" : ""}
//               hover:bg-green-50 cursor-pointer`}
//             onClick={() => onDateClick(cloneDay)}
//           >
//             <div className={`text-right ${
//               isSameDay(day, new Date()) ? "bg-green-500 text-white rounded-full w-6 h-6 ml-auto flex items-center justify-center" : ""
//             }`}>
//               {formattedDate}
//             </div>
            
//             {hasEvents && (
//               <div className="mt-1 overflow-hidden max-h-16">
//                 {dayEvents.map(event => (
//                   <div 
//                     key={event.id}
//                     className={`text-xs mb-1 p-1 rounded truncate 
//                       ${event.type === "meeting" ? "bg-blue-100 text-blue-800" : 
//                         event.type === "deadline" ? "bg-red-100 text-red-800" : 
//                         "bg-purple-100 text-purple-800"}`
//                     }
//                   >
//                     {event.title}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         );
//         day = addDays(day, 1);
//       }
      
//       rows.push(
//         <div key={day.toString()} className="grid grid-cols-7">
//           {days}
//         </div>
//       );
//       days = [];
//     }
//     return <div className="bg-white">{rows}</div>;
//   };

//   return (
//     <div className="w-full">
//       <div className="bg-white rounded-lg shadow overflow-hidden">
//         {renderHeader()}
//         {renderDays()}
//         {renderCells()}
//       </div>
      
//       {/* Event list for selected date */}
//       <div className="mt-6 bg-white rounded-lg shadow p-4">
//         <h3 className="text-lg font-semibold text-gray-800 mb-3">
//           Events for {format(selectedDate, "MMMM d, yyyy")}
//         </h3>
//         <div>
//           {events.filter(event => isSameDay(event.date, selectedDate)).length > 0 ? (
//             events
//               .filter(event => isSameDay(event.date, selectedDate))
//               .map(event => (
//                 <div 
//                   key={event.id} 
//                   className={`p-3 mb-2 rounded-lg
//                     ${event.type === "meeting" ? "bg-blue-50 border-l-4 border-blue-500" : 
//                       event.type === "deadline" ? "bg-red-50 border-l-4 border-red-500" : 
//                       "bg-purple-50 border-l-4 border-purple-500"}`
//                   }
//                 >
//                   <div className="font-medium text-gray-800">{event.title}</div>
//                   <div className="text-sm text-gray-600 mt-1">
//                     {format(event.date, "h:mm a")} - {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
//                   </div>
//                 </div>
//               ))
//           ) : (
//             <div className="text-gray-500 italic">No events scheduled for this day.</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// const AdminDashboard = () => {
//   const navigate = useNavigate();
//   const [currentFeature, setCurrentFeature] = useState(null);
//   const [greeting, setGreeting] = useState("");
//   const today = format(new Date(), "EEEE, MMMM d, yyyy");
  
//   // Simple analytics data
//   const analyticsData = {
//     employees: 125,
//     tasksCompleted: 47,
//     tasksInProgress: 18,
//     upcomingLeaves: 5
//   };

//   useEffect(() => {
//     const hour = new Date().getHours();
//     if (hour < 12) setGreeting("Good Morning");
//     else if (hour < 18) setGreeting("Good Afternoon");
//     else setGreeting("Good Evening");
//   }, []);

//   const renderFeatureContent = () => {
//     switch (currentFeature) {
//       case "employeeManagement":
//         return <EmployeeManagement onBack={() => setCurrentFeature(null)} />;
//       case "taskManagement":
//         return <TaskManagement onBack={() => setCurrentFeature(null)} />;
//       case "calendarPlanning":
//         return <CalendarPlanning onBack={() => setCurrentFeature(null)} />;
//       case "attendanceTracking":
//         return <AttendanceTracking />;
//       case "payrollManagement":
//         return <PayrollManagement />;
//       case "chat":
//         return <Chat />;
//       default:
//         return null;
//     }
//   };

//   const features = [
//     { label: "Employee Management", key: "employeeManagement", image: recruitment },
//     { label: "Task Management", key: "taskManagement", image: task },
//     { label: "Calendar Planning", key: "calendarPlanning", image: calendar },
//     { label: "Attendance Tracking", key: "attendanceTracking", image: attendance },
//     { label: "Payroll Management", key: "payrollManagement", image: pay },
//     { label: "Chat", key: "chat", image: chat },
//   ];

//   const tasks = [
//     { title: "Review Q1 Reports", priority: "high", deadline: "Today" },
//     { title: "Schedule Team Meeting", priority: "medium", deadline: "Tomorrow" },
//     { title: "Approve Leave Requests", priority: "medium", deadline: "Mar 24" },
//     { title: "Update Payroll System", priority: "high", deadline: "Mar 25" },
//     { title: "Conduct Performance Reviews", priority: "low", deadline: "Mar 30" }
//   ];

//   // Calendar for dashboard
//   const renderSimpleCalendar = () => {
//     const currentDate = new Date();
//     const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
//     const monthStart = startOfMonth(currentDate);
//     const startDay = startOfWeek(monthStart);
//     const daysInCalendar = [];
    
//     for (let i = 0; i < 7; i++) {
//       const day = addDays(startDay, i);
//       daysInCalendar.push(
//         <div key={i} className="flex flex-col items-center">
//           <div className="text-sm font-medium text-gray-500">{daysOfWeek[i]}</div>
//           <div className={`w-8 h-8 flex items-center justify-center rounded-full mt-1 text-sm
//             ${isSameDay(day, currentDate) ? "bg-green-500 text-white" : "text-gray-700"}`}>
//             {format(day, "d")}
//           </div>
//         </div>
//       );
//     }
    
//     return (
//       <div className="bg-white p-4 rounded-lg shadow-lg">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-semibold text-gray-800">{format(currentDate, "MMMM yyyy")}</h2>
//           <span className="text-green-600 font-medium text-sm">View Full Calendar</span>
//         </div>
//         <div className="flex justify-between">{daysInCalendar}</div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col">
//       {/* Modern Header with Glass Effect */}
//       <header className="sticky top-0 z-10 backdrop-blur-sm bg-green-900/90 shadow-lg">
//         <div className="container mx-auto px-6 py-3 flex justify-between items-center">
//           <div className="flex items-center">
//             <h1 className="text-3xl text-white font-bold">OfficeCorner</h1>
//           </div>
//           <div className="flex items-center space-x-4">
//             <span className="text-white font-medium">{today}</span>
//             <div className="relative group">
//               <button className="flex items-center space-x-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
//                 <span>Pam</span>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                 </svg>
//               </button>
//               <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
//                 <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Profile</a>
//                 <a href="#" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Settings</a>
//                 <a href="#" onClick={() => navigate("/")} className="block px-4 py-2 text-red-600 hover:bg-gray-100">Log Out</a>
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="flex-grow container mx-auto px-6 py-8">
//         {currentFeature ? (
//           <div className="w-full bg-white rounded-lg shadow-lg p-6">
//             <div className="flex items-center mb-6">
//               <button
//                 onClick={() => setCurrentFeature(null)}
//                 className="mr-4 p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition"
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
//                 </svg>
//               </button>
//               <h2 className="text-2xl font-bold text-gray-800">
//                 {features.find(f => f.key === currentFeature)?.label}
//               </h2>
//             </div>
//             <div className="mt-4">{renderFeatureContent()}</div>
//           </div>
//         ) : (
//           <>
//             {/* Welcome Section */}
//             <div className="mb-8">
//               <h2 className="text-2xl font-bold text-gray-800 mb-2">{greeting}, Admin Pam</h2>
//               <p className="text-gray-600">Here's what's happening with your team today.</p>
//             </div>
            
//             {/* Analytics Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//               <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm text-gray-500 font-medium">Total Employees</p>
//                     <p className="text-2xl font-bold text-gray-800">{analyticsData.employees}</p>
//                   </div>
//                   <div className="p-3 bg-blue-100 rounded-full">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
//               <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm text-gray-500 font-medium">Tasks Completed</p>
//                     <p className="text-2xl font-bold text-gray-800">{analyticsData.tasksCompleted}</p>
//                   </div>
//                   <div className="p-3 bg-green-100 rounded-full">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
//               <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm text-gray-500 font-medium">Tasks In Progress</p>
//                     <p className="text-2xl font-bold text-gray-800">{analyticsData.tasksInProgress}</p>
//                   </div>
//                   <div className="p-3 bg-yellow-100 rounded-full">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
//               <div className="bg-white rounded-lg shadow-lg p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm text-gray-500 font-medium">Upcoming Leaves</p>
//                     <p className="text-2xl font-bold text-gray-800">{analyticsData.upcomingLeaves}</p>
//                   </div>
//                   <div className="p-3 bg-purple-100 rounded-full">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>
//             </div>
            
//             {/* Features Grid */}
//             <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Access</h3>
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
//               {features.map((feature) => (
//                 <button
//                   key={feature.key}
//                   onClick={() => setCurrentFeature(feature.key)}
//                   className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center p-6 h-40"
//                 >
//                   <div className="bg-green-50 p-3 rounded-full mb-3">
//                     <img src={feature.image} alt={feature.label} className="w-10 h-10" />
//                   </div>
//                   <span className="text-gray-800 font-medium text-center">{feature.label}</span>
//                 </button>
//               ))}
//             </div>
            
//             {/* Calendar and Tasks Section */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//               <div>
//                 <h3 className="text-xl font-bold text-gray-800 mb-4">This Week</h3>
//                 {renderSimpleCalendar()}
                
//                 <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
//                   <div className="flex justify-between items-center mb-4">
//                     <h3 className="text-lg font-semibold text-gray-800">Upcoming Events</h3>
//                     <button className="text-sm text-green-600 font-medium">View All</button>
//                   </div>
//                   <div className="space-y-3">
//                     <div className="flex items-center p-3 bg-blue-50 rounded-lg">
//                       <div className="bg-blue-100 text-blue-800 p-3 rounded-lg mr-4">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                         </svg>
//                       </div>
//                       <div>
//                         <p className="font-medium text-gray-800">Team Meeting</p>
//                         <p className="text-sm text-gray-600">Today, 2:00 PM</p>
//                       </div>
//                     </div>
//                     <div className="flex items-center p-3 bg-green-50 rounded-lg">
//                       <div className="bg-green-100 text-green-800 p-3 rounded-lg mr-4">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
//                         </svg>
//                       </div>
//                       <div>
//                         <p className="font-medium text-gray-800">Project Deadline</p>
//                         <p className="text-sm text-gray-600">Tomorrow, 11:59 PM</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               <div>
//                 <h3 className="text-xl font-bold text-gray-800 mb-4">Tasks Report</h3>
//                 <div className="bg-white rounded-lg shadow-lg p-6">
//                   <div className="flex justify-between items-center mb-4">
//                     <h3 className="text-lg font-semibold text-gray-800">Pending Tasks</h3>
//                     <button className="text-sm text-green-600 font-medium">Add New</button>
//                   </div>
                  
//                   <div className="space-y-3">
//                     {tasks.map((task, index) => (
//                       <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
//                         <div className="flex items-center">
//                           <div className={`w-3 h-3 rounded-full mr-3 
//                             ${task.priority === "high" ? "bg-red-500" : 
//                               task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"}`}></div>
//                           <span className="text-gray-800">{task.title}</span>
//                         </div>
//                         <div className="flex items-center">
//                           <span className="text-sm text-gray-500 mr-4">{task.deadline}</span>
//                           <button className="text-gray-400 hover:text-gray-600">
//                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
//                             </svg>
//                           </button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
                  
//                   <div className="mt-6">
//                     <div className="flex justify-between items-center mb-2">
//                       <span className="text-sm font-medium text-gray-600">Task Progress</span>
//                       <span className="text-sm font-medium text-gray-600">72%</span>
//                     </div>
//                     <div className="w-full bg-gray-200 rounded-full h-2">
//                       <div className="bg-green-500 h-2 rounded-full" style={{ width: "72%" }}></div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import recruitment from "../assets/recruitment.png";
import task from "../assets/task.png";
import attendance from "../assets/attendance.png";
import calendar from "../assets/calendar.png";
import pay from "../assets/pay.png";
import chat from "../assets/chat.png";
import EmployeeManagement from "./EmployeeManagement";
import TaskManagement from "./TaskManagement";
import CalendarPlanning from "./CalendarPlanning";
import { format } from "date-fns";

const AttendanceTracking = () => <div>Track employee attendance here.</div>;
const PayrollManagement = () => <div>Manage employee salaries and payroll here.</div>;
const Chat = () => <div>Communicate with employees here.</div>;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentFeature, setCurrentFeature] = useState(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const renderFeatureContent = () => {
    switch (currentFeature) {
      case "employeeManagement":
        return <EmployeeManagement onBack={() => setCurrentFeature(null)} />;
      case "taskManagement":
        return <TaskManagement onBack={() => setCurrentFeature(null)} />;
      case "calendarPlanning":
        return <CalendarPlanning onBack={() => setCurrentFeature(null)} />;
      case "attendanceTracking":
        return <AttendanceTracking />;
      case "payrollManagement":
        return <PayrollManagement />;
      case "chat":
        return <Chat />;
      default:
        return null;
    }
  };

  const features = [
    { label: "Employee Management", key: "employeeManagement", image: recruitment },
    { label: "Task Management", key: "taskManagement", image: task },
    { label: "Calendar Planning", key: "calendarPlanning", image: calendar },
    { label: "Attendance Tracking", key: "attendanceTracking", image: attendance },
    { label: "Payroll Management", key: "payrollManagement", image: pay },
    { label: "Chat", key: "chat", image: chat },
  ];

  const tasks = [
    "Task 1: Review Reports",
    "Task 2: Schedule Meetings",
    "Task 3: Approve Leaves",
    "Task 4: Update Payroll",
    "Task 5: Conduct Interviews"
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 bg-green-900 rounded-full shadow-lg">
        <h1 className="text-3xl text-white font-bold">OfficeCorner</h1>
        <div className="flex items-center space-x-4">
          <span className="cursor-pointer bg-transparent text-white border border-white px-6 py-3 rounded-full hover:bg-green-500 hover:text-white transition">
            Welcome Admin, Pam
          </span>
          <button
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white"
            onClick={() => navigate("/")}
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col items-center justify-start p-6">
        {currentFeature ? (
          <div className="w-full max-w-5xl p-6 bg-white rounded-lg shadow-lg">
            <button
              onClick={() => setCurrentFeature(null)}
              className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Back
            </button>
            <div className="text-xl text-center font-semibold">{renderFeatureContent()}</div>
          </div>
        ) : (
          <>
            <div className="flex justify-center w-full gap-4 mt-6">
              {features.map((feature) => (
                <button
                  key={feature.key}
                  onClick={() => setCurrentFeature(feature.key)}
                  className="bg-white w-44 h-44 rounded-lg shadow-md hover:scale-105 transition-transform flex flex-col items-center justify-center p-4"
                >
                  <img src={feature.image} alt={feature.label} className="w-16 h-16 mb-2" />
                  <span className="text-cyan-700 text-center font-bold text-base">{feature.label}</span>
                </button>
              ))}
            </div>
            <div className="flex w-full max-w-5xl mt-6 gap-6">
              <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Calendar</h2>
                <div className="p-4 bg-green-200 rounded-lg text-center font-bold">{today}</div>
              </div>
              <div className="w-1/2 bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Tasks Report</h2>
                <ul className="list-disc pl-6">
                  {tasks.map((task, index) => (
                    <li key={index} className="text-lg text-gray-700">{task}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

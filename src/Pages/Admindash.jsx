import React, { useState } from 'react';
import recruitment from '../assets/recruitment.png';
import task from '../assets/task.png';
import attendance from '../assets/attendance.png';
import calendar from '../assets/calendar.png';
import pay from '../assets/pay.png';
import chat from '../assets/chat.png';

// Dummy Components for Each Feature
const EmployeeManagement = () => <div>Manage employee data and roles here.</div>;
const TaskManagement = () => <div>Assign and monitor tasks here.</div>;
const AttendanceTracking = () => <div>Track employee attendance here.</div>;
const CalendarPlanning = () => <div>Plan schedules and meetings here.</div>;
const PayrollManagement = () => <div>Manage employee salaries and payroll here.</div>;
const Chat = () => <div>Communicate with employees here.</div>;

const AdminDashboard = () => {
  const [currentFeature, setCurrentFeature] = useState(null); // Track the selected feature

  const renderFeatureContent = () => {
    switch (currentFeature) {
      case 'employeeManagement':
        return <EmployeeManagement />;
      case 'taskManagement':
        return <TaskManagement />;
      case 'calendarPlanning':
        return <CalendarPlanning />;
      case 'attendanceTracking':
        return <AttendanceTracking />;
      case 'payrollManagement':
        return <PayrollManagement />;
      case 'chat':
        return <Chat />;
      default:
        return null;
    }
  };

  const features = [
    { label: 'Employee Management', key: 'employeeManagement', image: recruitment },
    { label: 'Task Management', key: 'taskManagement', image: task },
    { label: 'Calendar Planning', key: 'calendarPlanning', image: calendar },
    { label: 'Attendance Tracking', key: 'attendanceTracking', image: attendance },
    { label: 'Payroll Management', key: 'payrollManagement', image: pay },
    { label: 'Chat', key: 'chat', image: chat },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-cyan-700 text-white py-4 px-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Agu Display, sans-serif' }}>
          OfficeCorner
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-lg">Pogo's Desktop</span>
          <button className="px-4 py-2 bg-yellow-600 rounded hover:bg-gray-600 text-white">
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <button
                key={feature.key}
                onClick={() => setCurrentFeature(feature.key)}
                className="bg-white w-56 h-56 rounded-lg shadow-md hover:scale-105 transition-transform flex flex-col items-center justify-center p-4"
              >
                <img src={feature.image} alt={feature.label} className="w-16 h-16 mb-4" />
                <span className="text-cyan-700 text-center font-bold">{feature.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

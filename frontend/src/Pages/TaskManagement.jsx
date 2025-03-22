// import React, { useState } from "react";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { Dialog } from "@headlessui/react";

// const TaskManagement = () => {
//   const [tasks, setTasks] = useState([
//     {
//       id: 1,
//       username: "saniya",
//       name: "Saniya Shrestha",
//       description: "Write an email to 123 bank",
//       dueDate: "10 Feb 2025",
//       status: "pending",
//     },
//     {
//       id: 2,
//       username: "arsha",
//       name: "Arsha Shrestha",
//       description: "Complete presentation",
//       dueDate: "15 Feb 2025",
//       status: "done",
//     },
//   ]);

//   const [isAddOpen, setIsAddOpen] = useState(false);
//   const [isDeleteOpen, setIsDeleteOpen] = useState(false);
//   const [taskToDelete, setTaskToDelete] = useState(null);
//   const [newTask, setNewTask] = useState({
//     username: "",
//     name: "",
//     description: "",
//     dueDate: "",
//     status: "pending",
//   });

//   const handleAddTask = () => {
//     setTasks([...tasks, { id: Date.now(), ...newTask }]);
//     setIsAddOpen(false);
//     setNewTask({ username: "", name: "", description: "", dueDate: "", status: "pending" });
//   };

//   const handleDeleteTask = () => {
//     setTasks(tasks.filter((task) => task.id !== taskToDelete));
//     setIsDeleteOpen(false);
//     setTaskToDelete(null);
//   };

//   return (
//     <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-2xl font-semibold text-gray-800">Task Detail</h2>
//         <button
//           className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
//           onClick={() => setIsAddOpen(true)}
//         >
//           Add Task
//         </button>
//       </div>
//       <div className="bg-white shadow-md rounded-lg overflow-hidden">
//         <table className="w-full border-collapse text-left">
//           <thead>
//             <tr className="bg-gray-200">
//               <th className="p-3">Username</th>
//               <th className="p-3">Name</th>
//               <th className="p-3">Description</th>
//               <th className="p-3">Due Date</th>
//               <th className="p-3">Status</th>
//               <th className="p-3">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {tasks.map((task) => (
//               <tr key={task.id} className="border-t">
//                 <td className="p-3">{task.username}</td>
//                 <td className="p-3">{task.name}</td>
//                 <td className="p-3">{task.description}</td>
//                 <td className="p-3">{task.dueDate}</td>
//                 <td className="p-3">{task.status}</td>
//                 <td className="p-3 flex space-x-4">
//                   <button className="text-blue-500 hover:text-blue-700">
//                     <FaEdit size={18} />
//                   </button>
//                   <button
//                     className="text-red-500 hover:text-red-700"
//                     onClick={() => {
//                       setTaskToDelete(task.id);
//                       setIsDeleteOpen(true);
//                     }}
//                   >
//                     <FaTrash size={18} />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Add Task Modal */}
//       <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//         <div className="bg-white p-6 rounded-lg shadow-lg w-96">
//           <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
//           <input
//             type="text"
//             placeholder="Username"
//             className="w-full mb-2 p-2 border rounded"
//             value={newTask.username}
//             onChange={(e) => setNewTask({ ...newTask, username: e.target.value })}
//           />
//           <input
//             type="text"
//             placeholder="Name"
//             className="w-full mb-2 p-2 border rounded"
//             value={newTask.name}
//             onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
//           />
//           <input
//             type="text"
//             placeholder="Description"
//             className="w-full mb-2 p-2 border rounded"
//             value={newTask.description}
//             onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
//           />
//           <input
//             type="date"
//             className="w-full mb-2 p-2 border rounded"
//             value={newTask.dueDate}
//             onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
//           />
//           <button
//             className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full mt-2"
//             onClick={handleAddTask}
//           >
//             Add Task
//           </button>
//           <button
//                 className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
//                 onClick={() => setIsModalOpen(false)}
//               >
//                 Cancel
//               </button>
//         </div>
//       </Dialog>

//       {/* Delete Confirmation Modal */}
//       <Dialog open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//         <div className="bg-white p-6 rounded-lg shadow-lg w-80">
//           <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
//           <p>Are you sure you want to delete this task?</p>
//           <div className="flex justify-end mt-4">
//             <button
//               className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
//               onClick={() => setIsDeleteOpen(false)}
//             >
//               Cancel
//             </button>
//             <button
//               className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
//               onClick={handleDeleteTask}
//             >
//               Delete
//             </button>
//           </div>
//         </div>
//       </Dialog>
//     </div>
//   );
// };

// export default TaskManagement;

import React, { useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { Dialog } from "@headlessui/react";

const TaskManagement = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      username: "saniya",
      name: "Saniya Shrestha",
      description: "Write an email to 123 bank",
      dueDate: "10 Feb 2025",
      status: "pending",
    },
    {
      id: 2,
      username: "arsha",
      name: "Arsha Shrestha",
      description: "Complete presentation",
      dueDate: "15 Feb 2025",
      status: "done",
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    username: "",
    name: "",
    description: "",
    dueDate: "",
    status: "pending",
  });

  const handleAddTask = () => {
    setTasks([...tasks, { id: Date.now(), ...newTask }]);
    setIsAddOpen(false);
    setNewTask({ username: "", name: "", description: "", dueDate: "", status: "pending" });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Task Detail</h2>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={() => setIsAddOpen(true)}
        >
          + Add Task
        </button>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">Description</th>
              <th className="p-3">Due Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t">
                <td className="p-3">{task.username}</td>
                <td className="p-3">{task.name}</td>
                <td className="p-3">{task.description}</td>
                <td className="p-3">{task.dueDate}</td>
                <td className="p-3">{task.status}</td>
                <td className="p-3 flex space-x-4">
                  <button className="text-blue-500 hover:text-blue-700">
                    <FaEdit size={18} />
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    <FaTrash size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Task Modal */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
          <input
            type="text"
            placeholder="Username"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.username}
            onChange={(e) => setNewTask({ ...newTask, username: e.target.value })}
          />
          <input
            type="text"
            placeholder="Name"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Description"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <input
            type="date"
            className="w-full mb-2 p-2 border rounded"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          />
          <div className="flex justify-between mt-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </button>
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleAddTask}
            >
              Add Task
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TaskManagement;


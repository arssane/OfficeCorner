// LoginForm.jsx
import React, { useState } from 'react';

const LoginForm = ({ onClose }) => {
  return (
    <div className="mt-8 p-6 bg-white rounded shadow-lg">
      <h2 className="text-3xl font-bold mb-4">Login</h2>
      <form>
        <div className="mb-4">
          <label className="block text-left text-gray-700">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-left text-gray-700">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full px-4 py-2 border border-gray-300 rounded mt-2"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            onClick={onClose} // Call onClose to hide the form
          >
            Close
          </button>
          <button
            type="submit"
            className="ml-2 px-6 py-2 bg-orange-500 text-white rounded hover:bg-cyan-900"
          >
            Login
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;

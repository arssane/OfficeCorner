// controllers/employeeController.js
import Employee from '../entities/Employee.js';
import { generateToken } from '../middleware/authMiddleware.js';

// Add this to employeeController.js

// Google sign-in for employees
export const googleEmployeeSignIn = async (req, res) => {
  const { token } = req.body;
  
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let employee = await Employee.findOne({ email });

    if (employee) {
      // Employee exists, generate token and return
      const jwtToken = generateToken(employee._id, employee.role);

      return res.status(200).json({
        message: 'Google Sign-in successful',
        token: jwtToken,
        user: {
          id: employee._id,
          username: employee.username,
          email: employee.email,
          role: employee.role,
        },
        redirectTo: '/employee'
      });
    } else {
      // Need to create a new employee from Google sign-in
      // Generate random password and username
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const username = name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
      
      employee = new Employee({
        username,
        name,
        email,
        password,
        phone: 'Not provided', // You might want to collect this later
        address: 'Not provided', // You might want to collect this later
        role: 'Employee'
      });
      
      await employee.save();
      
      const jwtToken = generateToken(employee._id, employee.role);
      
      return res.status(201).json({
        message: 'Google Sign-in successful. New employee account created.',
        token: jwtToken,
        user: {
          id: employee._id,
          username: employee.username,
          email: employee.email,
          role: employee.role,
        },
        redirectTo: '/employee'
      });
    }
  } catch (err) {
    console.error('Google Employee Sign-in error:', err);
    return res.status(400).json({ message: 'Invalid Google token' });
  }
};

// Get all employees - Admin only
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().select('-password');
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getEmployeeProfile = async (req, res) => {
  try {
    // The employee ID should be available in req.user from the protect middleware
    const employee = await Employee.findById(req.user.id)
      .select('-password') // Exclude sensitive data
      .lean();

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Add new employee - Admin only
export const addEmployee = async (req, res) => {
  try {
    const { username, name, email, password, phone, address } = req.body;

    // Check if employee exists
    const existingEmployee = await Employee.findOne({ $or: [{ email }, { username }] });
    if (existingEmployee) {
      return res.status(400).json({ 
        message: existingEmployee.email === email 
          ? 'Email already in use' 
          : 'Username already taken' 
      });
    }

    // Create new employee
    const newEmployee = new Employee({
      username,
      name,
      email,
      password,
      phone,
      address,
      role: 'Employee',
      createdBy: req.user.id // Admin who created this employee
    });

    await newEmployee.save();
    
    // Return employee without password
    const employeeData = newEmployee.toObject();
    delete employeeData.password;

    res.status(201).json({ 
      message: 'Employee created successfully',
      employee: employeeData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const employeeId = req.params.id;

    // Check if trying to update email to one that's already in use
    if (email) {
      const existingEmail = await Employee.findOne({ email, _id: { $ne: employeeId } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      { name, email, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({ 
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete employee - Admin only
export const deleteEmployee = async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register employee (for public signup)
export const registerEmployee = async (req, res) => {
  try {
    const { username, name, email, password, phone, address } = req.body;
    
    // Check if employee already exists
    const employeeExists = await Employee.findOne({ email });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee already exists' });
    }
    
    // Create new employee
    const employee = new Employee({
      username,
      name,
      email,
      password, // Will be hashed via pre-save hook
      phone,
      address,
      role: 'Employee'
    });
    
    await employee.save();
    
    // Generate JWT token
    const token = generateToken(employee._id);
    
    res.status(201).json({
      token,
      user: {
        _id: employee._id,
        username: employee.username,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login employee
export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find employee by email
    const employee = await Employee.findOne({ email });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if the password is correct
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(employee._id, employee.role);

    // Return employee data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: employee._id,
        username: employee.username,
        email: employee.email,
        role: employee.role
      },
      redirectTo: employee.role === 'Administrator' ? '/admin' : '/dashboard'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
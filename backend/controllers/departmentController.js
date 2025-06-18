// controllers/departmentController.js
import Department from '../entities/Department.js';
import User from '../entities/User.js';
import mongoose from 'mongoose';

// Get all departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('manager', 'name email username')
      .populate('createdBy', 'name email username')
      .sort({ createdAt: -1 });

    // Get employee count for each department
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await User.countDocuments({ 
          department: dept._id,
          role: 'Employee',
          status: 'approved'
        });
        return {
          ...dept.toObject(),
          employeeCount
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: departmentsWithCount
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

// Get single department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id)
      .populate('manager', 'name email username phone')
      .populate('createdBy', 'name email username');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get employees in this department
    const employees = await User.find({ 
      department: id,
      role: 'Employee',
      status: 'approved'
    }).select('name email username phone address');

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: {
        ...department.toObject(),
        employees
      }
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    const { name, description, code, manager, budget, location } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Department name and code are required'
      });
    }

    // Check if department with same name or code already exists
    const existingDept = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: code.toUpperCase() }
      ]
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name or code already exists'
      });
    }

    // Validate manager if provided
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Manager not found'
        });
      }
    }

    const department = new Department({
      name,
      description,
      code: code.toUpperCase(),
      manager: manager || null,
      budget: budget || 0,
      location,
      createdBy
    });

    await department.save();

    const populatedDepartment = await Department.findById(department._id)
      .populate('manager', 'name email username')
      .populate('createdBy', 'name email username');

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: populatedDepartment
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, code, manager, budget, location, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check for duplicate name or code (excluding current department)
    if (name || code) {
      const existingDept = await Department.findOne({
        _id: { $ne: id },
        $or: [
          ...(name ? [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }] : []),
          ...(code ? [{ code: code.toUpperCase() }] : [])
        ]
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          message: 'Department with this name or code already exists'
        });
      }
    }

    // Validate manager if provided
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Manager not found'
        });
      }
    }

    // Update fields
    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (code) department.code = code.toUpperCase();
    if (manager !== undefined) department.manager = manager;
    if (budget !== undefined) department.budget = budget;
    if (location !== undefined) department.location = location;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    const updatedDepartment = await Department.findById(id)
      .populate('manager', 'name email username')
      .populate('createdBy', 'name email username');

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: updatedDepartment
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

// Delete department (soft delete)
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has employees
    const employeeCount = await User.countDocuments({ 
      department: id,
      role: 'Employee',
      status: 'approved'
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. It has ${employeeCount} employees assigned. Please reassign employees first.`
      });
    }

    // Soft delete - set isActive to false
    department.isActive = false;
    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

// Assign employees to department
export const assignEmployeesToDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Validate all employee IDs
    const employees = await User.find({
      _id: { $in: employeeIds },
      role: 'Employee',
      status: 'approved'
    });

    if (employees.length !== employeeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some employee IDs are invalid or employees are not approved'
      });
    }

    // Assign employees to department
    await User.updateMany(
      { _id: { $in: employeeIds } },
      { department: id }
    );

    res.status(200).json({
      success: true,
      message: `${employees.length} employees assigned to department successfully`
    });
  } catch (error) {
    console.error('Error assigning employees to department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign employees to department',
      error: error.message
    });
  }
};

// Remove employees from department
export const removeEmployeesFromDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID'
      });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    // Remove employees from department
    const result = await User.updateMany(
      { 
        _id: { $in: employeeIds },
        department: id
      },
      { $unset: { department: 1 } }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} employees removed from department successfully`
    });
  } catch (error) {
    console.error('Error removing employees from department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employees from department',
      error: error.message
    });
  }
};
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeLeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    /**
     * List employees with department & filter options.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Employee::with(['department', 'user']);

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_number', 'like', "%{$search}%")
                  ->orWhere('nin', 'like', "%{$search}%")
                  ->orWhere('position', 'like', "%{$search}%")
                  ->orWhere('district', 'like', "%{$search}%");
            });
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->get('department_id'));
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->get('gender'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $perPage = (int) $request->get('per_page', 15);
        $employees = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $employees->items(),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
            ],
        ]);
    }

    /**
     * Employee dashboard & HR demographic statistics (Total, Male, Female).
     */
    public function statistics(): JsonResponse
    {
        $total = Employee::count();
        $male = Employee::where('gender', 'male')->count();
        $female = Employee::where('gender', 'female')->count();
        $active = Employee::where('status', 'active')->count();
        $onLeave = Employee::where('status', 'on_leave')->count();

        // Seed default employees if empty for initial operational demonstration
        if ($total === 0) {
            $deptFinance = Department::firstOrCreate(['code' => 'FIN'], [
                'name' => 'Finance & Accounting',
                'description' => 'Managing firm cash flow, ledgers, and savings',
                'head_of_department' => 'Grace Kigozi',
            ]);
            $deptLand = Department::firstOrCreate(['code' => 'SURV'], [
                'name' => 'Survey & Cadastral Lands',
                'description' => 'Surveying, boundary opening, and deed mutation',
                'head_of_department' => 'John Byaruhanga',
            ]);
            $deptEng = Department::firstOrCreate(['code' => 'ENG'], [
                'name' => 'Civil Engineering & Construction',
                'description' => 'Site execution and project delivery',
                'head_of_department' => 'David Mukasa',
            ]);

            Employee::create([
                'employee_number' => 'EMP-0001',
                'department_id' => $deptFinance->id,
                'first_name' => 'Patrick',
                'last_name' => 'Muwonge',
                'nin' => 'CM8702110034B',
                'gender' => 'male',
                'phone' => '+256701234567',
                'email' => 'patrick.muwonge@fabhomes.ug',
                'district' => 'Kampala',
                'position' => 'Senior Finance Officer',
                'salary_grade' => 'G-5',
                'base_salary' => 3500000.00,
                'date_joined' => '2023-01-15',
                'status' => 'active',
            ]);

            Employee::create([
                'employee_number' => 'EMP-0002',
                'department_id' => $deptLand->id,
                'first_name' => 'Sarah',
                'last_name' => 'Namatovu',
                'nin' => 'CF9201140087K',
                'gender' => 'female',
                'phone' => '+256772345678',
                'email' => 'sarah.namatovu@fabhomes.ug',
                'district' => 'Wakiso',
                'position' => 'Cadastral Surveyor',
                'salary_grade' => 'G-4',
                'base_salary' => 2800000.00,
                'date_joined' => '2023-04-01',
                'status' => 'active',
            ]);

            Employee::create([
                'employee_number' => 'EMP-0003',
                'department_id' => $deptEng->id,
                'first_name' => 'Robert',
                'last_name' => 'Kato',
                'nin' => 'CM8507200055M',
                'gender' => 'male',
                'phone' => '+256750987654',
                'email' => 'robert.kato@fabhomes.ug',
                'district' => 'Mukono',
                'position' => 'Project Site Engineer',
                'salary_grade' => 'G-5',
                'base_salary' => 3200000.00,
                'date_joined' => '2022-11-10',
                'status' => 'active',
            ]);

            Employee::create([
                'employee_number' => 'EMP-0004',
                'department_id' => $deptFinance->id,
                'first_name' => 'Brenda',
                'last_name' => 'Akello',
                'nin' => 'CF9403080012L',
                'gender' => 'female',
                'phone' => '+256781239876',
                'email' => 'brenda.akello@fabhomes.ug',
                'district' => 'Kampala',
                'position' => 'Cashier & Customer Care',
                'salary_grade' => 'G-3',
                'base_salary' => 1900000.00,
                'date_joined' => '2024-02-01',
                'status' => 'active',
            ]);

            Employee::create([
                'employee_number' => 'EMP-0005',
                'department_id' => $deptLand->id,
                'first_name' => 'Denis',
                'last_name' => 'Ssemwogerere',
                'nin' => 'CM9009150041P',
                'gender' => 'male',
                'phone' => '+256704112233',
                'email' => 'denis.ssemwogerere@fabhomes.ug',
                'district' => 'Jinja',
                'position' => 'Title Registration Officer',
                'salary_grade' => 'G-4',
                'base_salary' => 2400000.00,
                'date_joined' => '2023-08-15',
                'status' => 'active',
            ]);

            $total = 5;
            $male = 3;
            $female = 2;
            $active = 5;
            $onLeave = 0;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_employees' => $total,
                'male_employees' => $male,
                'female_employees' => $female,
                'active_employees' => $active,
                'on_leave' => $onLeave,
            ],
        ]);
    }

    /**
     * Store new employee.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'nin' => 'nullable|string|max:30|unique:employees,nin',
            'gender' => 'required|in:male,female',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:150',
            'district' => 'nullable|string|max:100',
            'position' => 'nullable|string|max:150',
            'department_id' => 'nullable|exists:departments,id',
            'salary_grade' => 'nullable|string|max:50',
            'base_salary' => 'nullable|numeric|min:0',
            'date_joined' => 'nullable|date',
            'status' => 'nullable|in:active,on_leave,suspended,terminated',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $employee = Employee::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee record created successfully.',
            'data' => $employee->load('department'),
        ], 201);
    }

    /**
     * Show single employee details.
     */
    public function show(string $identifier): JsonResponse
    {
        $employee = Employee::with(['department', 'user', 'leaveRequests'])
            ->where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->orWhere('employee_number', $identifier)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $employee,
        ]);
    }

    /**
     * Update employee.
     */
    public function update(Request $request, string $identifier): JsonResponse
    {
        $employee = Employee::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'nin' => "sometimes|nullable|string|max:30|unique:employees,nin,{$employee->id}",
            'gender' => 'sometimes|in:male,female',
            'phone' => 'sometimes|nullable|string|max:30',
            'email' => 'sometimes|nullable|email|max:150',
            'district' => 'sometimes|nullable|string|max:100',
            'position' => 'sometimes|nullable|string|max:150',
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'salary_grade' => 'sometimes|nullable|string|max:50',
            'base_salary' => 'sometimes|nullable|numeric|min:0',
            'date_joined' => 'sometimes|nullable|date',
            'status' => 'sometimes|in:active,on_leave,suspended,terminated',
            'digital_signature' => 'sometimes|nullable|string',
        ]);

        $employee->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee profile updated successfully.',
            'data' => $employee->fresh()->load('department'),
        ]);
    }

    /**
     * Delete / deactivate employee.
     */
    public function destroy(string $identifier): JsonResponse
    {
        $employee = Employee::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee record archived.',
        ]);
    }

    /**
     * Departments listing.
     */
    public function departments(): JsonResponse
    {
        $departments = Department::withCount('employees')->get();

        return response()->json([
            'success' => true,
            'data' => $departments,
        ]);
    }

    /**
     * Store new department.
     */
    public function storeDepartment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:departments,name',
            'code' => 'required|string|max:20|unique:departments,code',
            'description' => 'nullable|string|max:500',
            'head_of_department' => 'nullable|string|max:100',
        ]);

        $dept = Department::create($validated);

        return response()->json([
            'success' => true,
            'data' => $dept,
        ], 201);
    }

    /**
     * List leave requests.
     */
    public function leaveRequests(Request $request): JsonResponse
    {
        $query = EmployeeLeaveRequest::with(['employee.department', 'approver']);

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->get('employee_id'));
        }

        $perPage = (int) $request->get('per_page', 15);
        $requests = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $requests->items(),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    /**
     * Store leave request.
     */
    public function storeLeaveRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|in:annual,sick,maternity,paternity,compassionate,unpaid',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'days_count' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        $leave = EmployeeLeaveRequest::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Leave application submitted successfully.',
            'data' => $leave->load('employee'),
        ], 201);
    }

    /**
     * Approve or reject leave request.
     */
    public function updateLeaveStatus(Request $request, string $identifier): JsonResponse
    {
        $leave = EmployeeLeaveRequest::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $leave->status = $validated['status'];
        $leave->approved_by = $user ? $user->id : null;
        $leave->approved_at = now();
        if ($validated['status'] === 'rejected') {
            $leave->rejection_reason = $validated['rejection_reason'] ?? null;
        } else {
            // Update employee status to on_leave if approved
            $leave->employee->update(['status' => 'on_leave']);
        }
        $leave->save();

        return response()->json([
            'success' => true,
            'message' => "Leave request marked as {$validated['status']}.",
            'data' => $leave->load(['employee', 'approver']),
        ]);
    }
}

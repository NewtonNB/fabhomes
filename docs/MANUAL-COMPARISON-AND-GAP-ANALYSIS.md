# ZIMBANI PLATFORM — MANUAL COMPARISON & GAP ANALYSIS REPORT
## Comprehensive Audit of the Zimbani System Against the Fab Homes Land Management System User Manual (v1.0)

**Document Version:** 1.0  
**Date:** October 2026  
**Auditor / Role:** Senior Software Architect, Business Analyst, Security Engineer & Lead Technical Lead  
**Client / Domain:** Fab Homes Uganda (`Zimbani Platform`)  
**Reference Document:** `docs/Land Management System User Manual.pdf` (15 Pages, 13 Application Screenshots)

---

## 1. Executive Summary

A comprehensive, forensic audit was performed comparing the newly developed **Zimbani Platform** (built with React 18 frontend, PHP Laravel 11 backend, and MySQL 8 relational database) against the legacy **Fab Homes Land Saving Management System User Manual** (`v1.0`).

The legacy system was a Java desktop client communicating with a PHP/MySQL backend. The manual documents 14 core operational workflows across 15 pages. The modern Zimbani platform was architected as an enterprise, cloud-native web application and PWA with double-entry ledgers, RBAC, KYC verification, and milestone construction tracking.

### Key Audit Findings:
1. **Core Parity (85%+)**: Zimbani already possesses rich data models and controllers for clients, savings accounts, payments, petty cash, expense claims, site inspections, and digital document vaults.
2. **Identified Operational Gaps**:
   - **Dashboard (Manual Page 3)**: Missing legacy operational KPI cards: *Employees* (Total, Male, Female), *Construction* (#Projects, Done, Ongoing), and *Schemes* (#Schemes, Ongoing, Closed), as well as direct shortcuts to all manual modules.
   - **Titles Management (Manual Page 4)**: The manual requires a 5-tab interface: *Mother Title Management*, *My Fab Title Management*, *Plot Selection*, *Client Title Management*, and *Selection Status*. Zimbani currently renders a single client deed tab.
   - **CashBook (Manual Page 7)**: The manual requires a distinct split between **Overall CashBook** (all inflows/outflows) and **Saving CashBook** (client savings only), with an active **Cash Available** metric and **Add/Draw Cash** functionality. Zimbani has a unified ledger but lacks this dual-cashbook view.
   - **Employees & Leave Management (Manual Page 8)**: The manual has a 5-tab HR suite (*Employees*, *Salaries*, *Grade Settings*, *Leave*, *Departments*). Zimbani currently only tracks system users and construction site workers.
   - **Bulk Email Send (Manual Page 9)**: Dedicated dialog allowing filtering by *Phase* (Phase 1-7, Jinja), *Selected Schemes*, and targeted multi-scheme client emailing. The backend has notification engines, but lacks this exact UI tool.
   - **Client Refunds (Manual Page 10)**: The manual prescribes a dedicated two-column layout (*Refund Details* and *Approval Details*) with an automated **Deduction % Calculator** and balance recalculation. Zimbani had backend refund records but no dedicated UI desk.
   - **Digital Signatures (Manual Page 12)**: The manual provides an interactive canvas pad (touch/mouse) and image upload to capture user signatures and append them to official documents. Zimbani lacked signature capture.
   - **Construction Estimates & BoQ (Manual Page 11)**: Manual requires estimates categorized by Architect, Fab Homes, and Actual, with line items for Material, Labour, and Machinery, plus Contingency, Discount, and VAT calculations.

All identified gaps are fully solvable within the existing React + PHP Laravel + MySQL architecture without rewriting existing modules or corrupting any stored data.

---

## 2. Module-by-Module Comparison & Gap Classification

The table below audits every module documented in the 15-page manual:

| Manual Section | Manual Functionality | Current Zimbani Status | Classification | Evidence (Files & Code) | Enhancement Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Section 3: User Login** (Page 2) | Username & password authentication, role-based redirection to dashboard, session security. | Fully implemented with Sanctum tokens, rate limiting, and password reset. | **COMPLETE** | `Login.tsx`, `AuthController.php`, `ProtectedRoute.tsx` | Retain existing secure implementation. |
| **Section 4: Dashboard** (Page 3) | Quick overview with 3 specific cards: **Employees** (Total, Male, Female), **Construction** (#Projects, Done, Ongoing), **Schemes** (#Schemes, Ongoing, Closed). Module shortcut buttons. | Displays Projects, Sites, Units, Payments. Lacks employee gender breakdown, scheme status breakdown, and several module shortcuts. | **PARTIAL** | `Dashboard.tsx`, `ExecutiveReportingController.php` | Add the 3 legacy KPI cards and full module launchpad shortcuts. |
| **Section 6: Titles Management** (Page 4) | 5 Tabled Panes: 1. Mother Title Management (with transfer and subdivision tables), 2. My Fab Title, 3. Plot Selection, 4. Client Title Management, 5. Plot Selection Status. Search/Filter by Phase, ClientNo, Scheme, Estate. | Backend has `land_title_deeds` and `plot_reservations`. Frontend only renders a single client deed tab. | **PARTIAL** | `LandTitlesPage.tsx`, `land_title_deeds` table | Implement full 5-tab interface, Mother Title database schema, and subdivision linking. |
| **Section 7: Savings Management** (Page 5) | 4 Tabs: Savings Management, Saving Packages, View Saving Summary, Phases. Add Member to Saving Package, Add Member's Saving, view history, PDF/Excel export. | Full savings accounts, schemes, milestone pools, deposits, and statements. | **COMPLETE** | `SavingsAccountsList.tsx`, `SavingsAccountController.php`, `ConstructionSavingSchemeController.php` | Add quick modal for direct member savings deposit and ensure Phase filtering is intuitive. |
| **Section 7: Clients Management** (Page 5) | Add Client, Edit Client, Deactivate Client, Search/Filter by name, ID, contact. KYC documents. | Full CRUD, KYC verification, search, filtering, client portal self-service. | **COMPLETE** | `ClientsList.tsx`, `ClientForm.tsx`, `ClientController.php` | Retain existing implementation. |
| **Section 8: Expenses Management** (Page 6) | 6 Tabs: Add Petty Cash Expense, Expense Ledgers, Expenses By Date Range, Expenses With Details, Expense Categories, Petty Cash Transactions. Cheque/Voucher No, Bank, Payment Mode, Cash Available balance. | Implemented via Petty Cash Accounts and Expense Claims with approvals. | **COMPLETE** | `PettyCashList.tsx`, `ExpenseClaimsList.tsx`, `PettyCashAccountController.php` | Add voucher number and live Cash Available indicator to expense entry. |
| **Section 9: CashBook** (Page 7) | 2 Tabs: Add Or Draw Cash, Transactions History. Division into: **Overall CashBook** (all inflows) and **Saving CashBook** (client savings only). Cash Available balance metric, date range filter, export to PDF/Excel. | Backend has complete double-entry ledger. Frontend lists general transactions without the explicit Overall vs Saving CashBook split and Cash Available balance card. | **PARTIAL** | `TransactionsList.tsx`, `TransactionController.php` | Create dedicated CashBook view with Overall vs Saving tabs, Cash Available metric, and Add/Draw Cash dialog. |
| **Section 10: Employees Management** (Page 8) | 5 Tabs: Employees, Salaries, Grade Settings, Leave, Departments. Employee profiles (NIN, District, Position, Department, Gender). Send email to Employees. | Zimbani tracks users and site workers, but lacks an HR employee model, department structures, leave approvals, and gender demographics. | **MISSING** | `User.php`, `SiteWorker.php` | Implement `Employee`, `Department`, and `EmployeeLeaveRequest` models, migration, controller, and `EmployeesPage.tsx`. |
| **Section 11: Bulk Email Send** (Page 9) | Bulk Email Dialog: Select Phase (Phase 1-7, Jinja), Target (Selected Schemes vs All Clients), Load Schemes by Phase, multi-select schemes, Subject, Message, Send Email. | Backend has notification campaign dispatcher, but frontend lacks the dedicated Phase/Scheme multi-select email modal. | **PARTIAL** | `NotificationController.php`, `NotificationCampaign.php` | Create `BulkEmailModal.tsx` accessible from navigation, dashboard, and client/employee lists. |
| **Section 12: Client Refunds** (Page 10) | Two-column desk: Left: Refund Details (Request ID, Date, Client ID, Name, Phone, Email, Phase, Scheme, Amount Paid, Refund Requested, Notice Date, Reason). Right: Approval Details (Status, Deduction % with `Calc` button -> Deduction Amount, Bal After Refund, Approval Date, Approver, Payment Method, Notes). | Backend has `PaymentRefund` model, but lacks deduction % calculator fields and has NO frontend UI desk. | **MISSING UI** | `PaymentRefund.php`, `PaymentRefundDisputeController.php` | Enhance schema with deduction columns and create `ClientRefundsPage.tsx` with two-column layout and calculator. |
| **Section 13: Construction** (Page 11) | 5 Tabs: Estimates, Estimates List, Add Clients, Projects, Project Tasks. Estimates radio: Architect / Fab / Actual. Line items (Material, Labour, Machinery) with Qty, Rate, Total. Contingencies, Discount, VAT %, Subtotal, Total, Paid, Balance. | Projects, sites, units, tasks, milestone releases, materials, and equipment exist. Missing the specific 3-type Estimates / BoQ line item calculator. | **PARTIAL** | `ProjectsList.tsx`, `TasksList.tsx`, `MilestoneReleasesList.tsx` | Add Construction Estimates & BoQ view supporting Architect/Fab/Actual estimates with line items and VAT/contingency math. |
| **Section 14: Digital Signatures** (Page 12) | Interactive canvas to sign using mouse or touchpad, upload signature image, save to profile, and auto-append to documents/receipts. | Not implemented in user profiles or document vault. | **MISSING** | `Profile.tsx`, `DocumentController.php` | Implement `DigitalSignatureModal.tsx` with HTML5 canvas drawing, image upload, and backend profile storage. |
| **Section 15: User Addition** (Page 13) | Select Employee Name, assign Username, Password, Role, click Add. Double click to update or delete. | Fully implemented user management with role assignment, but not linked to an employee directory dropdown. | **PARTIAL** | `UsersList.tsx`, `UserManagementController.php` | Link user accounts to employee profiles via an employee dropdown. |
| **Section 15: Role Management** (Page 14) | Role dropdown, granular permission checkboxes, "Select All" button, Save button. Full SuperAdmin control. | Fully implemented with granular permissions grouped by module, toggle all, and Spatie RBAC. | **COMPLETE** | `RolesList.tsx`, `RoleManagementController.php` | Retain existing robust implementation. |
| **Section 15: Search, Filter & Exports** (Page 15) | Search & filter in all tables. Export reports to PDF and Excel. | Search & filter implemented in tables. PDF/CSV exports present in financial reports. | **COMPLETE** | `FinancialReportsDashboard.tsx`, `ExecutiveReportingController.php` | Ensure 1-click CSV/Excel and Print/PDF export buttons exist on CashBook, Titles, Refunds, and Employees. |

---

## 3. Justified Implementation Roadmap

To bring the Zimbani Platform into 100% alignment with the manual while maintaining modern architectural standards:

### Phase A: Database Schema Enhancements
1. **Employees & Departments**:
   - Create `departments` table (`id`, `name`, `code`, `description`).
   - Create `employees` table (`id`, `uuid`, `employee_number`, `user_id`, `department_id`, `first_name`, `last_name`, `nin`, `gender` ['male', 'female'], `phone`, `email`, `district`, `position`, `salary_grade`, `base_salary`, `status`).
   - Create `employee_leave_requests` table (`id`, `uuid`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days_count`, `reason`, `status`, `approved_by`, `approved_at`).
2. **Mother Land Titles & Subdivisions**:
   - Create `mother_titles` table (`id`, `uuid`, `record_no`, `phase`, `scheme`, `title_no`, `block_no`, `district`, `sub_county`, `village`, `estate_name`, `area_acres`, `subdivision_date`, `return_date`, `new_plot_no`, `title_status`, `verified_by`, `notes`).
   - Create `mother_title_transfers` table (`id`, `mother_title_id`, `date_taken`, `date_of_return`, `verified_by`, `purpose`, `status`).
3. **Client Refunds Enhancement**:
   - Add columns to `payment_refunds`: `scheme_name`, `phase_name`, `notice_date`, `deduction_percentage`, `deduction_amount`, `balance_after_refund`, `withdrawal_reason`, `payment_method`, `notes`.
4. **Digital Signature Storage**:
   - Add `signature_data` (longText/base64) and `employee_id` to `users` table.

### Phase B: Backend API Services & Controllers
1. `EmployeeController.php`: CRUD for employees, salary grades, leave requests, and department rosters. Also exposes `/employees/statistics` returning total employees, male headcount, and female headcount for the dashboard.
2. `MotherTitleController.php`: CRUD for mother titles, transfers, and plot subdivisions.
3. `CashBookController.php` / `TransactionController.php` enhancement: Expose dedicated `/cashbook/overall` and `/cashbook/savings` endpoints with date-range filters, running totals, and live `cash_available`.
4. Update `PaymentRefundDisputeController.php` to handle the manual's refund approval flow with deduction percentage math and savings balance adjustment.
5. Update `ExecutiveReportingController.php` to supply scheme statistics (total, ongoing, closed) and construction project stats (total, ongoing, done).

### Phase C: Frontend UI Engineering
1. **Dashboard Overhaul**:
   - Display the 3 legacy KPI cards:
     * **Employees**: Total, Male, Female.
     * **Construction**: Total Projects, Ongoing, Completed.
     * **Schemes**: Total Schemes, Ongoing, Closed.
   - Expand the Executive Launchpad with direct shortcuts to: *Titles Management*, *CashBook*, *Employees*, *Client Refunds*, *Bulk Email*, and *Digital Signatures*.
2. **Titles Management (5 Tabs)**:
   - Tab 1: *Mother Title Management* (Form, Subdivisions table, Transfer tracking).
   - Tab 2: *My Fab Title Management* (Fab Homes inventory).
   - Tab 3: *Plot Selection* (Interactive allocation to clients/schemes).
   - Tab 4: *Client Title Management* (Client deed records).
   - Tab 5: *Plot Selection Status* (Cadastral deed pipeline).
3. **CashBook (Overall vs Saving CashBook)**:
   - Split tabs for *Overall CashBook* (all inflows/outflows) and *Saving CashBook* (client savings).
   - Real-time *Cash Available* metric card.
   - *Add Or Draw Cash* modal dialog.
   - Date range filtering and PDF/Excel export.
4. **Client Refunds Desk**:
   - Dedicated two-column layout:
     * Left: *Refund Details* (Request ID, Client, Phase, Scheme, Amount Paid, Requested, Notice Date, Reason).
     * Right: *Approval Details* (Deduction % with interactive `Calc` button -> Deduction Amount, Balance After Refund, Approver, Payment Method, Notes, Action Buttons).
5. **Employees Management (5 Tabs)**:
   - Tab 1: *Employees Directory* (NIN, District, Department, Gender, Status).
   - Tab 2: *Salaries & Payroll*.
   - Tab 3: *Grade Settings*.
   - Tab 4: *Leave Management* (Leave request list & approval modal).
   - Tab 5: *Departments*.
   - "Send Email to Employees" button.
6. **Bulk Email Send Modal**:
   - Phase dropdown (Jinja, Phase 1 to Phase 7).
   - Target radio: "Selected Schemes" vs "All Clients".
   - "Load Schemes by Phase" action with multi-select checkboxes.
   - Subject & Message rich textarea with character count.
   - Direct broadcast dispatch.
7. **Digital Signatures Canvas**:
   - HTML5 drawing canvas with mouse and touchpad support (pen width, color, clear, undo).
   - Scanned signature image file upload.
   - Save to profile and display preview.

### Phase D: Automated Verification & Testing
- Unit and integration tests for new endpoints (`EmployeeControllerTest`, `MotherTitleTest`, `RefundCalculatorTest`).
- Frontend production build verification (`npm run build`).
- Git version control (`development` branch -> commit -> push -> `main` merge).

# Next Session Tasks - Units Module Completion

## 🎯 Primary Goal
Complete the Units Management UI to finish Phase 6 Week 1 Day 5

## ✅ Already Complete
- [x] UnitsList.tsx + CSS (415 lines)
- [x] Service layer with all API methods
- [x] Type definitions complete

## 📝 Remaining Tasks

### Task 1: Create UnitForm Component
**File:** `zimbani-frontend/src/pages/units/UnitForm.tsx` + `.css`

**Sections to Include:**
1. Basic Information
   - Unit number, unit name, unit type (12 options dropdown)
   - Site selection, block/floor, facing direction
   - Status dropdown (9 options)

2. Size & Specifications
   - Floor area, area unit, plot size (if applicable)
   - Bedrooms, bathrooms, parking spaces
   - Balcony/terrace details

3. Pricing Information
   - Base price, current price, minimum price, maximum price
   - Price per unit area (auto-calculated)
   - Discount percentage, special offers

4. Construction Details
   - Completion percentage (0-100%)
   - Construction start/end dates
   - Handover date, warranty end date

5. Features & Amenities
   - Interior features (multi-select or checkboxes)
   - Exterior features
   - Shared amenities

6. Additional Details
   - Description (textarea)
   - Special conditions
   - Internal notes

**Reference:** Use `SiteForm.tsx` as pattern (multi-section, validation, dropdowns)

**Estimated Lines:** ~600-700 (form + CSS)

---

### Task 2: Create UnitDetails Component
**File:** `zimbani-frontend/src/pages/units/UnitDetails.tsx` + `.css`

**Sections to Include:**
1. Header
   - Breadcrumb navigation
   - Unit name + badges (status, type)
   - Action buttons (Edit, Delete, Reserve, Sell, etc.)

2. Stats Cards Row (4 cards)
   - Current Price
   - Completion Progress
   - Payment Status (if sold)
   - Days on Market / Sold Date

3. Basic Information Section
   - Unit details grid
   - Site link
   - Specifications

4. Pricing Information Section
   - All pricing details
   - Price breakdown

5. Construction Progress Section
   - Progress bar (visual)
   - Start/End dates
   - Current status

6. Client Information Section (if reserved/sold)
   - Client name (link to clients module)
   - Reservation/Sale date
   - Payment summary

7. Payment History Section (if sold)
   - Table of payments received
   - Amount paid vs balance

8. Inspection History Section
   - Table of inspections
   - Latest inspection status

9. Features & Amenities Section
   - Display all features in organized layout

10. Related Actions
    - View Site
    - View Project
    - Manage Payments (if sold)
    - Update Progress

**Reference:** Use `SiteDetails.tsx` + `CompanyDetails.tsx` patterns

**Estimated Lines:** ~500-600 (component + CSS)

---

### Task 3: Create Action Modals

#### 3.1 ReserveUnitModal
**File:** `zimbani-frontend/src/pages/units/modals/ReserveUnitModal.tsx` + `.css`

**Fields:**
- Client selection/search
- Reservation date (default: today)
- Deposit amount
- Payment method
- Expiry date (optional)
- Notes

**API Call:** `unitService.reserve(uuid, data)`

**Estimated Lines:** ~200

---

#### 3.2 SellUnitModal
**File:** `zimbani-frontend/src/pages/units/modals/SellUnitModal.tsx` + `.css`

**Fields:**
- Client selection/search
- Sale date (default: today)
- Sale price (pre-filled from unit)
- Initial payment amount
- Payment method
- Payment plan selection
- Agreement number
- Notes

**API Call:** `unitService.sell(uuid, data)`

**Estimated Lines:** ~250

---

#### 3.3 UpdateProgressModal
**File:** `zimbani-frontend/src/pages/units/modals/UpdateProgressModal.tsx` + `.css`

**Fields:**
- Completion percentage (0-100 slider)
- Update date (default: today)
- Progress description
- Photos/documents upload (optional)
- Inspector name
- Notes

**API Call:** `unitService.updateProgress(uuid, data)`

**Note:** Auto-change status to 'completed' if percentage = 100%

**Estimated Lines:** ~200

---

#### 3.4 UpdatePaymentModal
**File:** `zimbani-frontend/src/pages/units/modals/UpdatePaymentModal.tsx` + `.css`

**Fields:**
- Payment date (default: today)
- Amount paid
- Payment method
- Transaction reference
- Receipt number
- Notes
- Display: Current balance, new balance (calculated)

**API Call:** `unitService.updatePayment(uuid, data)`

**Estimated Lines:** ~200

---

#### 3.5 UpdateInspectionModal
**File:** `zimbani-frontend/src/pages/units/modals/UpdateInspectionModal.tsx` + `.css`

**Fields:**
- Inspection date (default: today)
- Inspector name
- Inspection type (dropdown: Pre-handover, Final, Maintenance, Defect Check)
- Status (dropdown: Passed, Failed, Conditional Pass)
- Findings/Issues (textarea)
- Photos/documents upload (optional)
- Follow-up required (checkbox)
- Follow-up date (if required)
- Notes

**API Call:** `unitService.updateInspection(uuid, data)`

**Estimated Lines:** ~220

---

### Task 4: Update App.tsx with Units Routes
**File:** `zimbani-frontend/src/App.tsx`

**Add:**
```typescript
// Import components
import UnitsList from './pages/units/UnitsList'
import UnitForm from './pages/units/UnitForm'
import UnitDetails from './pages/units/UnitDetails'

// Add routes
<Route path="units" element={<UnitsList />} />
<Route path="units/new" element={<UnitForm />} />
<Route path="units/:uuid" element={<UnitDetails />} />
<Route path="units/:uuid/edit" element={<UnitForm />} />
```

**Note:** Units use UUID in routes (not ID) for public API

**Estimated Time:** 5 minutes

---

### Task 5: Testing & Bug Fixes
1. Test CRUD operations for all 4 modules:
   - Companies: Create, Read, Update, Delete
   - Projects: Create, Read, Update, Delete
   - Sites: Create, Read, Update, Delete
   - Units: Create, Read, Update, Delete + Actions

2. Test navigation flows:
   - Sidebar navigation
   - Breadcrumb navigation
   - Related entity links

3. Test form validation:
   - Required fields
   - Format validation
   - Error message display

4. Test action modals:
   - Reserve unit
   - Sell unit
   - Update progress
   - Record payment
   - Record inspection

5. Test responsive design:
   - Mobile view (< 768px)
   - Tablet view (768px - 1024px)
   - Desktop view (> 1024px)

6. Fix any bugs discovered

**Estimated Time:** 30-45 minutes

---

## 📊 Estimated Total Time
- Task 1 (UnitForm): 1.5 hours
- Task 2 (UnitDetails): 1 hour
- Task 3 (5 Modals): 2 hours
- Task 4 (Routes): 5 minutes
- Task 5 (Testing): 45 minutes
- **Total: 5-5.5 hours**

---

## 🎨 Design Guidelines

### Modal Design Pattern
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitUuid: string;
  onSuccess?: () => void;
}

// Structure:
- Overlay (dark background)
- Modal Container (centered, max-width 600px)
  - Header (title + close button)
  - Body (form fields)
  - Footer (Cancel + Submit buttons)
```

### Form Validation Pattern
```typescript
const [formData, setFormData] = useState<T>({ ... });
const [errors, setErrors] = useState<{[key: string]: string[]}>({});

// On submit catch 422 errors:
catch (err: any) {
  if (err.response?.data?.errors) {
    setErrors(err.response.data.errors);
  }
}

// Display: {errors.field_name && <span className="error">{errors.field_name[0]}</span>}
```

### Loading States Pattern
```typescript
const [loading, setLoading] = useState(false);

// During submit:
<button disabled={loading}>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

---

## 🔗 API Endpoints Reference

### Unit Actions
```
POST /api/v1/units/{uuid}/reserve
POST /api/v1/units/{uuid}/sell
PATCH /api/v1/units/{uuid}/progress
PATCH /api/v1/units/{uuid}/inspection
PATCH /api/v1/units/{uuid}/payment
```

### Request Body Examples

**Reserve:**
```json
{
  "client_id": 1,
  "reservation_date": "2026-10-06",
  "deposit_amount": 5000000,
  "expiry_date": "2026-11-06",
  "notes": "Reserved by Newton"
}
```

**Sell:**
```json
{
  "client_id": 1,
  "sale_date": "2026-10-06",
  "sale_price": 150000000,
  "payment_method": "bank_transfer",
  "initial_payment": 50000000
}
```

**Progress:**
```json
{
  "completion_percentage": 75,
  "update_date": "2026-10-06",
  "notes": "Roofing completed"
}
```

**Payment:**
```json
{
  "payment_date": "2026-10-06",
  "amount": 20000000,
  "payment_method": "mobile_money",
  "transaction_reference": "TXN123456"
}
```

**Inspection:**
```json
{
  "inspection_date": "2026-10-06",
  "inspector_name": "John Doe",
  "inspection_type": "pre_handover",
  "status": "passed",
  "findings": "All checks passed",
  "follow_up_required": false
}
```

---

## 📚 Files to Reference

### For UnitForm
- `src/pages/sites/SiteForm.tsx` (multi-section layout)
- `src/pages/projects/ProjectForm.tsx` (complex form with calculations)
- `src/types/unit.types.ts` (field definitions)

### For UnitDetails
- `src/pages/sites/SiteDetails.tsx` (comprehensive details)
- `src/pages/companies/CompanyDetails.tsx` (stats cards pattern)

### For Modals
- Create new pattern (no existing modal components)
- Use standard React state management
- Consider creating reusable Modal wrapper

---

## ✅ Definition of Done
- [ ] All 4 UI files created (UnitForm, UnitDetails + CSS files)
- [ ] All 5 modal components created with CSS
- [ ] Routes registered in App.tsx
- [ ] All CRUD operations work end-to-end
- [ ] All action modals functional
- [ ] Form validation working
- [ ] Error handling implemented
- [ ] Responsive design verified
- [ ] Code committed and pushed to GitHub
- [ ] README updated with completion status

---

## 🚀 Quick Start Commands

### Backend
```bash
cd "d:\Fab Homes\zimbani-backend"
php artisan serve --port=8001
```

### Frontend
```bash
cd "d:\Fab Homes\zimbani-frontend"
npm run dev
```

### Test Account
- Email: admin@zimbani.com
- Password: password

---

**Priority:** High  
**Complexity:** Medium-High  
**Estimated Completion:** Next session (5-6 hours)

**Note:** Focus on completing core functionality first. File uploads and advanced features can be added later if time permits.

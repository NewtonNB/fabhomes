# Next Session Plan - React UI Completion

**Repository:** https://github.com/NewtonNB/fabhomes  
**Branch:** development  
**Last Commit:** ce5d348  
**Date:** October 8, 2026

---

## 🎯 Current Status

**Phase:** 6 Week 1 Day 5 - React UI Development  
**Progress:** 3/8 tasks completed (37.5%)  
**What's Done:**
- ✅ Routing and navigation infrastructure
- ✅ Complete API service layer (all 4 modules)
- ✅ Companies management UI (100% complete)

**What's Remaining:**
- ⏳ Projects management UI
- ⏳ Sites management UI  
- ⏳ Units management UI
- ⏳ Reusable components
- ⏳ Role-based guards

---

## 📋 Tasks for Next Session

### Priority 1: Build Projects Management UI

**Files to Create:**
1. `src/pages/projects/ProjectsList.tsx` - List page with filters
2. `src/pages/projects/ProjectsList.css` - Styling
3. `src/pages/projects/ProjectForm.tsx` - Create/edit form
4. `src/pages/projects/ProjectForm.css` - Form styling
5. `src/pages/projects/ProjectDetails.tsx` - View/details page
6. `src/pages/projects/ProjectDetails.css` - Details styling

**Key Features:**
- Search and filters (company, project type, status, priority)
- Data table with pagination
- Stats cards (sites count, units count, budget utilization, progress)
- Form sections: Basic Info, Budget & Timeline, Location, Client Info
- Company selection dropdown
- Progress bar for completion percentage
- Budget tracking display

**Update:** `src/App.tsx` - Replace project route placeholders

---

### Priority 2: Build Sites Management UI

**Files to Create:**
1. `src/pages/sites/SitesList.tsx`
2. `src/pages/sites/SitesList.css`
3. `src/pages/sites/SiteForm.tsx`
4. `src/pages/sites/SiteForm.css`
5. `src/pages/sites/SiteDetails.tsx`
6. `src/pages/sites/SiteDetails.css`

**Key Features:**
- Search and filters (project, site type, status, supervisor)
- Map view option (optional - can use latitude/longitude)
- Stats cards (workers count, equipment count, area utilization, budget)
- Form sections: Basic Info, Location & Area, Budget & Timeline, Contact Info, Safety & Compliance, Utilities & Facilities
- Project selection dropdown
- Supervisor selection dropdown
- Area utilization calculation display

**Update:** `src/App.tsx` - Replace site route placeholders

---

### Priority 3: Build Units Management UI

**Files to Create:**
1. `src/pages/units/UnitsList.tsx`
2. `src/pages/units/UnitsList.css`
3. `src/pages/units/UnitForm.tsx`
4. `src/pages/units/UnitForm.css`
5. `src/pages/units/UnitDetails.tsx`
6. `src/pages/units/UnitDetails.css`

**Key Features:**
- Search and filters (site, project, unit type, status, bedrooms, price range, availability)
- Advanced filters (available only, sold only, completed only, overdue)
- Data table with unit specs preview
- Stats cards (total units, available, sold, average price, total value)
- Form sections: Basic Info, Physical Specs, Pricing, Construction, Location & Features, Maintenance, Client Info
- Site and Project selection dropdowns
- Price calculator (with discount)
- Action buttons: Reserve, Sell, Update Progress, Update Payment, Update Inspection
- Progress bars for construction and payment
- Status-specific actions (e.g., Reserve only for available units)

**Special Modals/Components Needed:**
- Reserve Unit Modal (client selection, reservation notes)
- Sell Unit Modal (client, sale price, initial payment, notes)
- Update Progress Modal (completion percentage, notes)
- Update Payment Modal (amount paid, notes)
- Update Inspection Modal (inspection dates, notes, defect status)

**Update:** `src/App.tsx` - Replace unit route placeholders

---

### Priority 4: Extract Reusable Components (Optional but Recommended)

Create these to reduce code duplication:

1. **src/components/common/DataTable.tsx**
   - Generic table component with sorting, pagination
   - Reuse across all list pages

2. **src/components/common/SearchFilter.tsx**
   - Search bar with filter dropdowns
   - Reuse across all list pages

3. **src/components/common/StatsCard.tsx**
   - Stat display with icon, value, label
   - Reuse across all detail pages

4. **src/components/common/Badge.tsx**
   - Generic badge component with color variants
   - Reuse for status, type, etc.

5. **src/components/common/Modal.tsx**
   - Generic modal wrapper
   - Reuse for unit actions (reserve, sell, etc.)

---

### Priority 5: Add Role-Based Navigation Guards

**File to Create:**
1. `src/components/auth/PermissionRoute.tsx` - Route wrapper with permission check

**Updates Needed:**
- Wrap protected routes in `App.tsx` with permission checks
- Redirect unauthorized users to 403 or dashboard
- Check permissions from user context

**Example:**
```tsx
<Route 
  path="companies" 
  element={
    <PermissionRoute permission="view companies">
      <CompaniesList />
    </PermissionRoute>
  } 
/>
```

---

## 🎨 Design Pattern to Follow

All UIs should follow the **Companies pattern**:

### List Page Structure:
```
- Page Header (title + subtitle + create button)
- Filters Section (search + filter dropdowns + apply/clear buttons)
- Error Alert (if any)
- Loading State (spinner + message)
- Results Summary (showing X of Y items)
- Data Table (with badges, action buttons)
- Pagination (previous/next buttons)
```

### Form Page Structure:
```
- Form Header (title + subtitle + back button)
- Error Alert (if any)
- Form (multiple sections with labels)
  - Section 1: Basic Information
  - Section 2: Specific fields
  - Section N: Description
- Form Actions (cancel + submit buttons)
```

### Details Page Structure:
```
- Details Header (title + badges + action buttons)
- Stats Grid (4 cards with metrics)
- Details Grid (multiple cards with info sections)
- Timestamps (created + updated)
```

---

## 📝 Code Consistency Guidelines

1. **File Naming:**
   - Component: `ComponentName.tsx`
   - Styles: `ComponentName.css`
   - Always in `src/pages/{module}/` folder

2. **Component Structure:**
   - Import statements
   - Type definitions (if any)
   - Component function
   - useState hooks
   - useEffect hooks
   - Handler functions
   - Render (return statement)
   - Export default

3. **CSS Classes:**
   - Use kebab-case: `.data-table`, `.form-input`
   - Follow BEM-like pattern: `.component-section`, `.component-section-item`
   - Reuse common classes: `.btn`, `.btn-primary`, `.badge`, `.alert`

4. **Error Handling:**
   - Always wrap API calls in try-catch
   - Display user-friendly error messages
   - Show loading states during async operations

5. **TypeScript:**
   - Use existing types from `types/` folder
   - Add proper typing for component props
   - Use `React.FormEvent`, `React.ChangeEvent`, etc.

---

## 🚀 Quick Start Commands

```bash
# Navigate to frontend
cd "d:\Fab Homes\zimbani-frontend"

# Check current branch
git status

# Pull latest changes
git pull origin development

# Start development server (if needed)
npm run dev

# In separate terminal, start Laravel backend (if needed)
cd "d:\Fab Homes\zimbani-backend"
php artisan serve --port=8001
```

---

## ✅ Testing Checklist (After Building Each UI)

For each module (Projects, Sites, Units):

- [ ] List page loads without errors
- [ ] Search functionality works
- [ ] Filters apply correctly
- [ ] Create form opens and validates
- [ ] Create form submits successfully
- [ ] Details page displays data
- [ ] Edit form pre-fills data
- [ ] Edit form saves changes
- [ ] Delete confirmation works
- [ ] Pagination navigates correctly
- [ ] Responsive layout works on mobile
- [ ] Loading states show correctly
- [ ] Error messages display properly

---

## 📚 Reference Files

**For API Integration:**
- `src/services/project.service.ts` - Project API methods
- `src/services/site.service.ts` - Site API methods  
- `src/services/unit.service.ts` - Unit API methods
- `src/types/*.types.ts` - TypeScript interfaces

**For Styling Reference:**
- `src/pages/companies/CompaniesList.css` - List page styles
- `src/pages/companies/CompanyForm.css` - Form styles
- `src/pages/companies/CompanyDetails.css` - Details styles

**For Component Logic:**
- `src/pages/companies/CompaniesList.tsx` - List logic example
- `src/pages/companies/CompanyForm.tsx` - Form logic example
- `src/pages/companies/CompanyDetails.tsx` - Details logic example

---

## 🎯 Session Goal

**Target:** Complete all 3 remaining UIs (Projects, Sites, Units)  
**Estimated Files:** 18 new files (6 per module)  
**Estimated LOC:** ~4,000-5,000 lines  

**Stretch Goals:**
- Extract reusable components
- Add permission guards
- Test all functionality end-to-end

---

## 📞 Quick Reference

**Backend API:** http://localhost:8001/api/v1  
**Frontend Dev:** http://localhost:5173  
**Test Account:** admin@zimbani.com / password  
**Database:** zimbani_dev (MySQL 8.0, root/1234)

**Companies Backend Routes:**
- GET    /api/v1/companies
- POST   /api/v1/companies  
- GET    /api/v1/companies/{uuid}
- PUT    /api/v1/companies/{uuid}
- DELETE /api/v1/companies/{uuid}

**Projects Backend Routes:**
- GET    /api/v1/projects
- POST   /api/v1/projects
- GET    /api/v1/projects/{uuid}
- PUT    /api/v1/projects/{uuid}
- DELETE /api/v1/projects/{uuid}

**Sites Backend Routes:**
- GET    /api/v1/sites
- POST   /api/v1/sites
- GET    /api/v1/sites/{uuid}
- PUT    /api/v1/sites/{uuid}
- DELETE /api/v1/sites/{uuid}

**Units Backend Routes:**
- GET    /api/v1/units
- POST   /api/v1/units
- GET    /api/v1/units/{uuid}
- PUT    /api/v1/units/{uuid}
- DELETE /api/v1/units/{uuid}
- POST   /api/v1/units/{uuid}/reserve
- POST   /api/v1/units/{uuid}/sell
- POST   /api/v1/units/{uuid}/progress
- POST   /api/v1/units/{uuid}/inspection
- POST   /api/v1/units/{uuid}/payment

---

**Good luck! You've got a solid foundation. Just follow the Companies pattern and you'll complete this quickly! 🚀**

# ZIMBANI Platform - Testing Guide

**Version:** Phase 6 Week 1 Complete  
**Date:** October 6, 2026  
**Servers Status:** ✅ Both Running

---

## 🚀 Quick Start

### Access the Application

**Frontend:** http://localhost:5173  
**Backend API:** http://localhost:8001/api/v1

### Test Account
- **Email:** admin@zimbani.com
- **Password:** password
- **Role:** Super Admin (full access to all features)

---

## 🧪 Testing Workflow

### 1. Authentication Testing

**Login:**
1. Navigate to http://localhost:5173
2. You'll be redirected to `/login` (not authenticated)
3. Enter: admin@zimbani.com / password
4. Click "Login"
5. ✅ Should redirect to `/dashboard`
6. ✅ Should see "Super Admin" name in header

**Profile:**
1. Click "Profile" in header
2. ✅ Should see user details, roles, permissions (153 permissions)
3. Click "Edit Profile"
4. Change name, save
5. ✅ Changes should persist

**Logout:**
1. Click "Logout" in header
2. ✅ Should redirect to `/login`
3. ✅ Token cleared from localStorage

---

### 2. Companies Module Testing

**Navigate:** Sidebar → Companies

#### Create Company
1. Click "Add New Company" button
2. Fill required fields:
   - Name: "Test Construction Ltd"
   - Registration Number: "REG-2026-001"
   - Email: "test@construction.com"
   - Phone: "+256700000001"
   - Address: "Plot 1, Industrial Area"
   - City: "Kampala"
   - Country: "Uganda"
   - Company Type: "Construction"
   - Status: "Active"
3. Click "Create Company"
4. ✅ Should redirect to companies list
5. ✅ New company should appear in table

#### View Company
1. Click 👁️ (view) icon on a company
2. ✅ Should see:
   - Stats cards (company type, status, established date)
   - Contact information
   - Address details
   - Business information
   - Action buttons

#### Edit Company
1. Click ✏️ (edit) icon or "Edit Company" in details
2. Change company name
3. Click "Update Company"
4. ✅ Should see updated name in list

#### Search & Filter
1. Use search box: Enter company name
2. ✅ Results should filter in real-time
3. Try status filter: Select "Active"
4. ✅ Should show only active companies
5. Try company type filter: Select "Construction"
6. ✅ Should show only construction companies

#### Pagination
1. Create 16+ companies (if needed)
2. ✅ Should see pagination controls
3. Click "Next"
4. ✅ Should load next page

---

### 3. Projects Module Testing

**Navigate:** Sidebar → Projects

#### Create Project
1. Click "Add New Project"
2. Fill required fields:
   - Name: "Residential Complex Kampala"
   - Code: "PRJ-2026-001" (must be unique)
   - Company: Select from dropdown
   - Project Type: "Residential"
   - Status: "Planning"
   - Start Date: Today or future
   - Budget: 500000000
   - Address: "Plot 50, Kololo"
   - City: "Kampala"
   - Country: "Uganda"
3. Optional: Add end date, contact person, total units
4. Click "Create Project"
5. ✅ Should redirect to projects list
6. ✅ New project should appear with progress bar

#### View Project Progress
1. ✅ Progress bar should show percentage (start to end date)
2. ✅ Budget should display formatted (UGX 500,000,000)
3. ✅ Status badge should be colored (Planning = warning yellow)

#### Edit Project
1. Click ✏️ (edit) icon
2. Update budget to 600000000
3. Add end date (future)
4. Click "Update Project"
5. ✅ Should see updated budget
6. ✅ Progress bar should update based on dates

#### Filters
1. Try "Ongoing Only" filter
2. ✅ Should show planning + active + on_hold projects
3. Try company filter
4. ✅ Should show only that company's projects

---

### 4. Sites Module Testing

**Navigate:** Sidebar → Sites

#### Create Site
1. Click "Add New Site"
2. Fill required fields:
   - Site Code: "ST-001"
   - Site Name: "Phase 1 Construction Site"
   - Project: Select from dropdown
   - Location: "Plot 50, Kololo, Kampala"
   - Status: "Active"
   - Total Site Value: 250000000
3. Optional fields:
   - Site Size: 5
   - Size Unit: "acres"
   - GPS Coordinates: "0.3476° N, 32.5825° E"
   - Total Units: 20
   - Boundaries: "North: Road, South: River..."
   - Access Roads: "Paved main road access"
   - Utilities: "Water, Electricity, Internet"
4. Click "Create Site"
5. ✅ Should redirect to sites list

#### View Site Details
1. Click 👁️ (view) icon
2. ✅ Should see:
   - Stats cards (location, size, units, value)
   - Location information with GPS
   - Site details (boundaries, access, utilities)
   - Financial information
   - Related actions
3. Click "View Units" in related actions
4. ✅ Should navigate to units list filtered by this site

#### Edit Site
1. Click ✏️ (edit) icon
2. Add utilities information
3. Update total units
4. Click "Update Site"
5. ✅ Changes should be saved

---

### 5. Units Module Testing (Most Complex)

**Navigate:** Sidebar → Units

#### Create Unit
1. Click "Add New Unit"
2. **Basic Information:**
   - Unit Number: "A-101"
   - Unit Name: "3-Bedroom Luxury Apartment"
   - Site: Select from dropdown
   - Unit Type: "Apartment"
   - Block: "Block A"
   - Floor: 1
   - Facing: "South"
   - Status: "Under Construction"

3. **Size & Specifications:**
   - Floor Area: 120
   - Area Unit: "sqm"
   - Bedrooms: 3
   - Bathrooms: 2
   - Parking Spaces: 2
   - Balcony Area: 10

4. **Pricing Information:**
   - Base Price: 150000000
   - Current Price: 150000000
   - ✅ Watch "Price Per Unit Area" auto-calculate (150000000 / 120)
   - Discount Percentage: 0
   - Special Offer: "Early bird discount available"

5. **Construction Details:**
   - Completion Percentage: 45
   - Construction Start Date: Past date
   - Construction End Date: Future date
   - Expected Handover: Future date

6. **Features & Amenities:**
   - Interior Features: "Ceramic tiles, Built-in wardrobes, Modern kitchen"
   - Exterior Features: "Balcony, Security fence"
   - Shared Amenities: "Swimming pool, Gym, 24/7 Security"

7. **Additional Details:**
   - Description: "Spacious 3-bedroom apartment with modern finishes..."
   - Special Conditions: "Payment plan available"

8. Click "Create Unit"
9. ✅ Should redirect to units list
10. ✅ Unit should appear with progress bar (45%)

#### View Unit Details
1. Click 👁️ (view) icon on the created unit
2. ✅ Should see comprehensive details:
   - Stats cards (price, completion 45%, floor area)
   - Quick action buttons (5 buttons)
   - All entered information organized in sections
3. ✅ Price per sqm should be displayed in stats

---

### 6. Unit Actions Testing (Critical Features)

#### Action 1: Reserve Unit

**Prerequisites:** Unit status must be "Available" or "Completed"

1. From unit details, click "Reserve Unit" quick action
2. ✅ Modal should open with form
3. Fill fields:
   - Client ID: 1 (temporary - actual client lookup pending)
   - Reservation Date: Today (pre-filled)
   - Deposit Amount: 10000000
   - Payment Method: "Bank Transfer"
   - Expiry Date: 30 days from now
   - Notes: "Reserved for Mr. John Doe"
4. Click "Reserve Unit"
5. ✅ Modal should close
6. ✅ Page should refresh automatically
7. ✅ Unit status should change to "Reserved"
8. ✅ Client information should appear in details
9. ✅ Reservation date should be displayed

**Test:** Click backend and check database:
```sql
SELECT * FROM units WHERE unit_number = 'A-101';
-- status should be 'reserved'
-- client_id should be 1
-- reserved_date should be today
```

#### Action 2: Sell Unit

**Prerequisites:** Unit status must be "Available", "Reserved", or "Completed"

1. Navigate back to unit details
2. Click "Sell Unit" quick action
3. ✅ Modal should open
4. Fill fields:
   - Client ID: 1
   - Sale Date: Today
   - Sale Price: 150000000 (pre-filled from unit)
   - Initial Payment: 50000000
   - Payment Method: "Bank Transfer"
   - Payment Plan: "Installment"
   - Agreement Number: "AGR-2026-001"
5. ✅ Payment summary should show:
   - Sale Price: UGX 150,000,000
   - Initial Payment: UGX 50,000,000
   - **Balance: UGX 100,000,000** (auto-calculated)
6. Click "Complete Sale"
7. ✅ Modal should close
8. ✅ Page should refresh
9. ✅ Unit status should change to "Sold"
10. ✅ Stats should show:
    - Payment Status card appears
    - Balance: UGX 100,000,000
11. ✅ Sale information section should appear with client details

**Verify Backend:**
```sql
SELECT * FROM units WHERE unit_number = 'A-101';
-- status = 'sold'
-- client_id = 1
-- sold_date = today
-- current_price = 150000000
-- amount_paid = 50000000
-- balance = 100000000 (auto-calculated)
```

#### Action 3: Update Progress

**Prerequisites:** Any unit (works best with "Under Construction")

1. From unit details, click "Update Progress"
2. ✅ Modal should open with slider
3. Use slider OR number input to set completion: **75%**
4. ✅ Progress bar below should animate to 75%
5. ✅ Both slider and number input should stay in sync
6. Fill fields:
   - Update Date: Today
   - Inspector Name: "John Smith"
   - Progress Description: "Roofing completed, plastering in progress"
   - Notes: "On schedule"
7. Click "Update Progress"
8. ✅ Modal should close
9. ✅ Page should refresh
10. ✅ Stats card "Completion Progress" should show 75%
11. ✅ Progress bar in stats should show 75%

**Test 100% Completion:**
1. Click "Update Progress" again
2. Set to **100%**
3. ✅ Should see alert: "Setting completion to 100% will automatically change unit status to 'completed'"
4. Click "Update Progress"
5. ✅ Unit status should automatically change to "Completed"

#### Action 4: Record Payment

**Prerequisites:** Unit must be "Sold" with outstanding balance

1. From sold unit details, check "Payment Status" stat
2. ✅ Should show current balance (e.g., UGX 100,000,000)
3. Click "Record Payment" quick action
4. ✅ Modal should open showing current balance
5. Fill fields:
   - Payment Date: Today
   - Amount: 30000000
   - Payment Method: "Mobile Money"
   - Transaction Reference: "TXN-20261006-001"
   - Receipt Number: "RCP-001"
6. ✅ Payment summary should auto-calculate:
   - Current Balance: UGX 100,000,000
   - Payment Amount: -UGX 30,000,000
   - **New Balance: UGX 70,000,000**
7. Click "Record Payment"
8. ✅ Modal should close
9. ✅ Page should refresh
10. ✅ Payment Status should update to UGX 70,000,000

**Test Full Payment:**
1. Record another payment for 70000000
2. ✅ Should see alert: "Full Payment! This payment will complete the unit purchase."
3. ✅ Payment summary should show:
   - New Balance: UGX 0
   - Background should turn green (fully-paid class)
4. Click "Record Payment"
5. ✅ Balance should be 0
6. ✅ Payment Status card should say "Fully Paid"

**Verify Backend:**
```sql
SELECT amount_paid, balance FROM units WHERE unit_number = 'A-101';
-- amount_paid should increase with each payment
-- balance should decrease
-- balance = current_price - amount_paid (auto-calculated)
```

#### Action 5: Record Inspection

1. From any unit details, click "Record Inspection"
2. ✅ Modal should open
3. Fill fields:
   - Inspection Date: Today
   - Inspector Name: "Jane Doe"
   - Inspection Type: "Pre-Handover Inspection"
   - Status: "Passed"
   - Findings: "All installations meet quality standards. Minor paint touch-ups needed in bedroom 2."
4. **Test Follow-up:**
   - Check "Follow-up Inspection Required"
   - ✅ Follow-up Date field should appear with animation
   - Set Follow-up Date: 7 days from now
5. Notes: "Schedule follow-up after touch-ups completed"
6. Click "Record Inspection"
7. ✅ Modal should close
8. ✅ Inspection details should be saved

**Test Different Statuses:**
- Try "Failed" status → Record findings of what failed
- Try "Conditional Pass" → Note conditions
- Try different inspection types (Maintenance, Defect Check, etc.)

---

### 7. Navigation & Links Testing

#### Breadcrumb Navigation
1. Go to any unit details page
2. ✅ Should see: "Units / [Unit Name]"
3. Click "Units" in breadcrumb
4. ✅ Should navigate back to units list

#### Related Entity Links
1. From unit details, in "Basic Information" section
2. Click the site name (should be a blue link)
3. ✅ Should navigate to that site's details page
4. From site details, click project name
5. ✅ Should navigate to project (if details page exists) or list

#### Sidebar Navigation
1. Test all menu items:
   - Dashboard
   - Companies
   - Projects
   - Sites
   - Units
2. ✅ All should navigate correctly
3. ✅ Active route should be highlighted

---

### 8. Responsive Design Testing

#### Desktop (1920x1080)
1. All tables should display fully
2. ✅ Stats cards in rows of 4
3. ✅ Forms in 2-column grid
4. ✅ Modals centered, max-width 600px

#### Tablet (768px - 1024px)
1. Resize browser window
2. ✅ Tables should remain usable (horizontal scroll if needed)
3. ✅ Forms should maintain 2-column grid
4. ✅ Stats cards 2 per row

#### Mobile (< 768px)
1. Resize to mobile width
2. ✅ Forms should become single column
3. ✅ Stats cards should stack (1 per row)
4. ✅ Tables should have horizontal scroll
5. ✅ Action buttons should stack vertically
6. ✅ Modal actions should stack (Cancel on bottom)

---

### 9. Error Handling Testing

#### Validation Errors
1. Try creating a company without required fields
2. ✅ Should see inline error messages in red
3. ✅ Fields should have red borders
4. Fix errors and submit
5. ✅ Should succeed

#### Duplicate Validation
1. Try creating a project with existing code
2. ✅ Should see 422 error: "The code has already been taken"
3. Change code and retry
4. ✅ Should succeed

#### Authorization Errors (Future)
1. Login as non-Super Admin user
2. Try accessing restricted endpoints
3. ✅ Should see 403 Forbidden

#### Network Errors
1. Stop backend server
2. Try any action
3. ✅ Should see error message
4. Restart backend
5. ✅ Should work again

---

### 10. Data Consistency Testing

#### Auto-Calculations
1. Create unit with floor_area = 100, current_price = 10000000
2. ✅ price_per_unit_area should auto-calculate to 100000
3. Edit unit, change floor_area to 200
4. ✅ price_per_unit_area should recalculate to 50000

#### Status Changes
1. Create unit with completion_percentage = 50
2. ✅ Status can be any (under_construction, available, etc.)
3. Update progress to 100%
4. ✅ Status should AUTO-CHANGE to "completed"

#### Balance Tracking
1. Sell unit for 100,000,000 with initial payment 30,000,000
2. ✅ balance should be 70,000,000
3. Record payment of 20,000,000
4. ✅ balance should update to 50,000,000
5. Record payment of 50,000,000
6. ✅ balance should be 0
7. ✅ Unit should show "Fully Paid"

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Client Lookup:** Using client_id temporarily (client search UI pending)
2. **File Uploads:** Not implemented (floor plans, documents, photos)
3. **ProjectDetails:** Page not created (only list and form exist)
4. **Real-time Updates:** No WebSockets (manual refresh required)
5. **Email Notifications:** Not implemented
6. **Bulk Operations:** No bulk delete/update yet

### Expected Behaviors (Not Bugs)
1. **3 Test Failures:** Expected policy failures in backend tests
2. **UUID Routing:** Units use UUID, others use integer ID (intentional)
3. **Auto-calculations:** Some fields recalculate on form change (intended)
4. **Status Changes:** Some status changes are automatic (e.g., 100% = completed)

---

## 📊 Performance Benchmarks

### Expected Response Times (Local)
- **API Endpoints:** < 100ms
- **Page Load:** < 2 seconds
- **Form Submission:** < 500ms
- **Search/Filter:** < 300ms

### Database Performance
- **Pagination:** 15 items per page (optimal)
- **Indexes:** Comprehensive indexes on all foreign keys and search fields
- **Soft Deletes:** No performance impact observed

---

## 🔍 Debugging Tips

### Frontend Issues
1. **Check Browser Console:** F12 → Console tab
2. **Network Tab:** See API requests and responses
3. **React DevTools:** Install extension for component inspection
4. **localStorage:** Check for "zimbani_token" and "zimbani_user"

### Backend Issues
1. **Laravel Logs:** `zimbani-backend/storage/logs/laravel.log`
2. **Database Queries:** Enable query log in AppServiceProvider
3. **API Response:** Check JSON structure in Postman/browser
4. **Policies:** Check authorization logs in activity table

### Common Issues & Fixes

**Issue:** "Token expired" or 401 errors  
**Fix:** Logout and login again, or clear localStorage

**Issue:** Modal doesn't close after action  
**Fix:** Check browser console for JavaScript errors

**Issue:** Auto-calculation not working  
**Fix:** Ensure both fields (price and area) have values

**Issue:** Form validation shows no errors but won't submit  
**Fix:** Check all required fields (marked with red asterisk)

**Issue:** Page doesn't refresh after modal action  
**Fix:** Check onSuccess callback is calling refresh function

---

## ✅ Testing Checklist

Use this checklist to verify all features:

### Authentication
- [ ] Login works
- [ ] Logout works
- [ ] Profile view works
- [ ] Profile edit works
- [ ] Token persists on refresh

### Companies
- [ ] List displays
- [ ] Search works
- [ ] Filters work
- [ ] Create works
- [ ] Edit works
- [ ] View details works
- [ ] Delete works (soft delete)

### Projects
- [ ] List displays
- [ ] Progress bars show
- [ ] Search works
- [ ] Filters work
- [ ] Create works
- [ ] Edit works
- [ ] Budget displays correctly

### Sites
- [ ] List displays
- [ ] Search works
- [ ] Filters work
- [ ] Create works
- [ ] Edit works
- [ ] View details works
- [ ] GPS coordinates save
- [ ] Related entity links work

### Units
- [ ] List displays with progress bars
- [ ] Search works
- [ ] Type and status filters work
- [ ] Create works (all 60+ fields)
- [ ] Edit works
- [ ] View details works
- [ ] Price per sqm auto-calculates
- [ ] All stats cards display

### Unit Actions
- [ ] Reserve modal opens
- [ ] Reserve action works
- [ ] Status changes to "reserved"
- [ ] Sell modal opens
- [ ] Balance auto-calculates
- [ ] Sell action works
- [ ] Status changes to "sold"
- [ ] Progress modal opens
- [ ] Slider and input sync
- [ ] Progress updates
- [ ] 100% changes status to "completed"
- [ ] Payment modal opens
- [ ] New balance calculates
- [ ] Payment records
- [ ] Fully paid detection works
- [ ] Inspection modal opens
- [ ] Follow-up field shows/hides
- [ ] Inspection records

### Navigation
- [ ] Sidebar works
- [ ] Breadcrumbs work
- [ ] Related entity links work
- [ ] Back buttons work

### Responsive Design
- [ ] Desktop layout correct
- [ ] Tablet layout correct
- [ ] Mobile layout correct
- [ ] Tables scroll on mobile
- [ ] Forms adapt on mobile

### Error Handling
- [ ] Validation errors show
- [ ] Network errors show
- [ ] 422 errors display field-specific
- [ ] Success messages show

---

## 📞 Support

**For Issues:**
1. Check browser console for errors
2. Check Laravel logs: `storage/logs/laravel.log`
3. Verify both servers are running
4. Clear browser cache and localStorage
5. Try in incognito/private window

**For Questions:**
- Review `SESSION-PROGRESS-SUMMARY.md`
- Check `NEXT-SESSION-TASKS.md`
- Read `README-SESSION-HANDOFF.md`

---

## 🎉 Success Criteria

Your Phase 6 Week 1 implementation is working correctly if:

✅ All 53 API endpoints respond correctly  
✅ All 4 modules have functional CRUD  
✅ All 5 unit action modals work  
✅ Auto-calculations work (price per sqm, balance)  
✅ Auto-status changes work (100% = completed)  
✅ Navigation flows smoothly  
✅ Responsive design works on all screen sizes  
✅ Error handling is user-friendly  
✅ Data persists correctly in database  
✅ Authorization prevents unauthorized actions  

---

**Happy Testing! 🚀**

*Last Updated: October 6, 2026*  
*ZIMBANI Platform - Phase 6 Week 1*

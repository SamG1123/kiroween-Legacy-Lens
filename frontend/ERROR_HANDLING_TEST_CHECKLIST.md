# Error Handling Test Checklist

Use this checklist to manually test all error handling features.

## Setup

- [ ] Backend server is running
- [ ] Frontend dev server is running (`npm run dev`)
- [ ] Browser console is open for debugging

## 1. ErrorBoundary Tests

### Test 1.1: Component Error
- [ ] Temporarily add `throw new Error('Test error')` to a component
- [ ] Verify ErrorBoundary catches the error
- [ ] Verify error message is displayed
- [ ] Verify "Try Again" button appears
- [ ] Verify "Go Home" button appears
- [ ] Click "Try Again" and verify component resets
- [ ] In dev mode, verify stack trace is visible
- [ ] Remove the test error

## 2. Network Error Tests

### Test 2.1: Dashboard Network Error
- [ ] Stop the backend server
- [ ] Navigate to dashboard
- [ ] Verify ErrorDisplay shows network error
- [ ] Verify error message mentions connection
- [ ] Verify "Try Again" button appears
- [ ] Start backend server
- [ ] Click "Try Again"
- [ ] Verify projects load successfully
- [ ] Verify success state is shown

### Test 2.2: Project Page Network Error
- [ ] Stop the backend server
- [ ] Navigate to a project page
- [ ] Verify ErrorDisplay shows network error
- [ ] Verify "Try Again" button appears
- [ ] Start backend server
- [ ] Click "Try Again"
- [ ] Verify project loads successfully

## 3. Form Validation Tests

### Test 3.1: GitHub URL Validation
- [ ] Open Upload Modal
- [ ] Select GitHub tab
- [ ] Leave URL field empty and try to submit
- [ ] Verify "GitHub URL is required" error appears
- [ ] Enter invalid URL: "not-a-url"
- [ ] Verify "Please enter a valid GitHub repository URL" error
- [ ] Enter valid URL: "https://github.com/user/repo"
- [ ] Verify error disappears

### Test 3.2: Project Name Validation
- [ ] In Upload Modal, leave project name empty
- [ ] Try to submit
- [ ] Verify "Project name is required" error appears
- [ ] Enter short name: "ab"
- [ ] Verify "Project name must be at least 3 characters" error
- [ ] Enter valid name: "Test Project"
- [ ] Verify error disappears

### Test 3.3: File Upload Validation
- [ ] Select ZIP tab in Upload Modal
- [ ] Try to submit without selecting file
- [ ] Verify "Please select a file" error appears
- [ ] Try to upload non-ZIP file (if possible)
- [ ] Verify "Only ZIP files are supported" error
- [ ] Try to upload file >100MB (if possible)
- [ ] Verify file size error appears
- [ ] Upload valid ZIP file
- [ ] Verify error disappears

### Test 3.4: Local Path Validation
- [ ] Select Local tab in Upload Modal
- [ ] Leave path field empty
- [ ] Try to submit
- [ ] Verify "Local path is required" error appears
- [ ] Enter valid path
- [ ] Verify error disappears

## 4. Toast Notification Tests

### Test 4.1: Success Toast
- [ ] Create a new project successfully
- [ ] Verify green success toast appears
- [ ] Verify message: "Project created successfully!"
- [ ] Verify toast auto-dismisses after ~3 seconds

### Test 4.2: Error Toast
- [ ] Stop backend server
- [ ] Try to create a project
- [ ] Verify red error toast appears
- [ ] Verify error message is user-friendly
- [ ] Verify toast auto-dismisses after ~5 seconds

### Test 4.3: Delete Success Toast
- [ ] Delete a project
- [ ] Verify success toast appears
- [ ] Verify message includes project name
- [ ] Verify toast auto-dismisses

### Test 4.4: Delete Error Toast
- [ ] Stop backend server
- [ ] Try to delete a project
- [ ] Verify error toast appears
- [ ] Verify error message is clear

## 5. Loading States Tests

### Test 5.1: Dashboard Loading
- [ ] Clear browser cache
- [ ] Navigate to dashboard
- [ ] Verify loading spinner appears
- [ ] Verify "Loading projects..." message
- [ ] Verify loading state disappears when data loads

### Test 5.2: Project Page Loading
- [ ] Navigate to a project page
- [ ] Verify loading spinner appears
- [ ] Verify "Loading project details..." message
- [ ] Verify loading state disappears when data loads

### Test 5.3: Upload Progress
- [ ] Upload a large ZIP file
- [ ] Verify progress bar appears
- [ ] Verify percentage updates
- [ ] Verify progress bar reaches 100%

## 6. Retry Functionality Tests

### Test 6.1: Dashboard Retry
- [ ] Stop backend server
- [ ] Navigate to dashboard
- [ ] Verify error display with retry button
- [ ] Start backend server
- [ ] Click "Try Again"
- [ ] Verify data loads successfully
- [ ] Verify error display disappears

### Test 6.2: Project Page Retry
- [ ] Stop backend server
- [ ] Navigate to project page
- [ ] Verify error display with retry button
- [ ] Start backend server
- [ ] Click "Try Again"
- [ ] Verify data loads successfully

### Test 6.3: Tab-Level Retry
- [ ] Navigate to project page
- [ ] Stop backend server
- [ ] Click on Languages tab
- [ ] Verify error display with retry button
- [ ] Start backend server
- [ ] Click "Try Again"
- [ ] Verify language data loads

## 7. Error Message Quality Tests

### Test 7.1: User-Friendly Messages
- [ ] Trigger various errors
- [ ] Verify no technical jargon in messages
- [ ] Verify messages are clear and concise
- [ ] Verify messages explain what went wrong

### Test 7.2: Actionable Suggestions
- [ ] Trigger network error
- [ ] Verify suggestion mentions checking connection
- [ ] Trigger validation error
- [ ] Verify suggestion mentions reviewing form
- [ ] Trigger server error
- [ ] Verify suggestion mentions waiting and retrying

## 8. WebSocket Error Tests

### Test 8.1: Connection Error
- [ ] Start an analysis
- [ ] Stop backend server during analysis
- [ ] Verify WebSocket error message appears
- [ ] Verify "Retry Connection" button appears
- [ ] Start backend server
- [ ] Click "Retry Connection"
- [ ] Verify connection restores

### Test 8.2: Reconnection
- [ ] Start an analysis
- [ ] Temporarily disconnect internet
- [ ] Verify connection error appears
- [ ] Reconnect internet
- [ ] Verify automatic reconnection occurs

## 9. Delete Confirmation Tests

### Test 9.1: Delete Dialog
- [ ] Click delete on a project card
- [ ] Verify confirmation dialog appears
- [ ] Verify project name is shown
- [ ] Verify warning message is clear
- [ ] Click "Cancel"
- [ ] Verify dialog closes without deleting

### Test 9.2: Delete Success
- [ ] Click delete on a project card
- [ ] Click "Delete" in confirmation
- [ ] Verify success toast appears
- [ ] Verify project is removed from list
- [ ] Verify dashboard updates

### Test 9.3: Delete Error
- [ ] Stop backend server
- [ ] Try to delete a project
- [ ] Verify error toast appears
- [ ] Verify project is not removed
- [ ] Verify error message is clear

## 10. Edge Cases Tests

### Test 10.1: Multiple Errors
- [ ] Trigger multiple errors quickly
- [ ] Verify all error toasts appear
- [ ] Verify toasts stack properly
- [ ] Verify toasts don't overlap

### Test 10.2: Rapid Retry
- [ ] Trigger an error
- [ ] Click retry multiple times quickly
- [ ] Verify only one request is made
- [ ] Verify no duplicate data

### Test 10.3: Navigation During Error
- [ ] Trigger an error on dashboard
- [ ] Navigate to another page
- [ ] Verify error doesn't persist
- [ ] Navigate back
- [ ] Verify fresh data load

## 11. Accessibility Tests

### Test 11.1: Keyboard Navigation
- [ ] Use Tab key to navigate error displays
- [ ] Verify focus indicators are visible
- [ ] Verify retry buttons are keyboard accessible
- [ ] Press Enter on retry button
- [ ] Verify retry action triggers

### Test 11.2: Screen Reader
- [ ] Enable screen reader
- [ ] Trigger an error
- [ ] Verify error is announced
- [ ] Verify error message is read
- [ ] Verify buttons are properly labeled

### Test 11.3: Color Contrast
- [ ] Check error displays in light mode
- [ ] Verify text is readable
- [ ] Check error displays in dark mode (if applicable)
- [ ] Verify contrast meets WCAG AA standards

## 12. Responsive Tests

### Test 12.1: Mobile View
- [ ] Resize browser to mobile width (<640px)
- [ ] Trigger various errors
- [ ] Verify error displays are readable
- [ ] Verify buttons are touch-friendly
- [ ] Verify toasts are positioned correctly

### Test 12.2: Tablet View
- [ ] Resize browser to tablet width (640-1024px)
- [ ] Trigger various errors
- [ ] Verify error displays adapt properly
- [ ] Verify layout is appropriate

### Test 12.3: Desktop View
- [ ] Resize browser to desktop width (>1024px)
- [ ] Trigger various errors
- [ ] Verify error displays use full space
- [ ] Verify layout is optimal

## Test Results Summary

Date: _______________
Tester: _______________

Total Tests: 50+
Passed: _____
Failed: _____
Skipped: _____

### Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Notes:
_______________________________________________
_______________________________________________
_______________________________________________

## Sign-off

- [ ] All critical tests passed
- [ ] All error messages are user-friendly
- [ ] All retry functionality works
- [ ] All validation works correctly
- [ ] All accessibility requirements met
- [ ] Ready for production

Signed: _______________ Date: _______________

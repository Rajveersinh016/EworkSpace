# Staff Login Troubleshooting Guide

## 🚨 **Staff Login Issues - Quick Fixes**

If you're experiencing problems with staff login, follow these steps to diagnose and fix the issue.

## 🔍 **Step 1: Check Console for Errors**

1. **Open Browser Console** (F12 → Console tab)
2. **Look for error messages** when attempting to login
3. **Check for role-related warnings** like "User role missing" or "Invalid role"

## 🔧 **Step 2: Verify User Role in Database**

### **Check Firebase Console:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Realtime Database**
4. Navigate to `/users/{your-uid}`
5. Verify the `role` field shows `"staff"` (not `"student"`)

### **Expected User Structure:**
```json
{
  "uid": "your-user-id",
  "name": "Your Name",
  "email": "your@email.com",
  "role": "staff",  // ← This should be "staff"
  "department": "Your Department",
  "createdAt": "timestamp",
  "lastLogin": "timestamp"
}
```

## 🧪 **Step 3: Use Debug Functions**

### **In the Test File (`test-firebase-integration.html`):**
1. **Click "Debug Current User"** - Shows current user state
2. **Click "Sync Current User"** - Forces synchronization
3. **Check the test log** for detailed information

### **In Browser Console:**
```javascript
// Check current user state
debugCurrentUser();

// Force sync current user
syncCurrentUser();

// Check role directly
console.log('Current user:', currentUser);
console.log('User role:', currentUser?.role);
```

## 🚫 **Step 4: Common Issues & Solutions**

### **Issue 1: "User role missing in database"**
**Symptoms:** Console shows warning about missing role
**Solution:** 
1. Check Firebase database for user record
2. Ensure `role` field exists and is set to `"staff"`
3. If missing, manually add: `"role": "staff"`

### **Issue 2: "Only staff can create assignments"**
**Symptoms:** Staff user gets permission denied error
**Solution:**
1. Verify user role is `"staff"` in database
2. Check if `currentUser.role` is properly set
3. Use `syncCurrentUser()` to force synchronization

### **Issue 3: Role shows as "student" instead of "staff"**
**Symptoms:** User logs in but system treats them as student
**Solution:**
1. Check Firebase database role field
2. Clear browser storage (localStorage/sessionStorage)
3. Log out and log back in
4. Use `syncCurrentUser()` after login

### **Issue 4: Firebase services not syncing**
**Symptoms:** Main app shows staff role but Firebase services don't
**Solution:**
1. Check if `window.firebaseServices` exists
2. Verify Firebase services are initialized
3. Use `syncCurrentUser()` to force sync

## 🔄 **Step 5: Manual Role Fix**

### **If Role is Wrong in Database:**
1. **Go to Firebase Console → Realtime Database**
2. **Navigate to `/users/{your-uid}`**
3. **Edit the `role` field:**
   ```json
   {
     "role": "staff"
   }
   ```
4. **Save the changes**
5. **Log out and log back in**

### **If Role is Wrong in Browser:**
1. **Clear browser storage:**
   ```javascript
   localStorage.removeItem('currentUser');
   sessionStorage.removeItem('currentUser');
   ```
2. **Refresh the page**
3. **Log in again**

## 📱 **Step 6: Test Role Functions**

### **After Login, Test in Console:**
```javascript
// Check if role functions work
checkUserRole();           // Should return "staff"
hasRole('staff');          // Should return true
hasRole('student');        // Should return false

// Test permission function
requireRole('staff', 'create assignments'); // Should return true
```

## 🚀 **Step 7: Verify Staff Permissions**

### **Test Staff-Only Functions:**
1. **Create Assignment** - Should work for staff
2. **Create Announcement** - Should work for staff  
3. **Create Schedule** - Should work for staff
4. **Review Applications** - Should work for staff

### **Test Student-Restricted Functions:**
1. **Submit Assignment** - Should show "Only students can submit assignments"
2. **Submit Application** - Should show "Only students can submit applications"

## 🔍 **Step 8: Advanced Debugging**

### **Check All User Data Sources:**
```javascript
// Main app
console.log('Main App currentUser:', currentUser);

// Local storage
console.log('localStorage:', JSON.parse(localStorage.getItem('currentUser')));

// Session storage  
console.log('sessionStorage:', JSON.parse(sessionStorage.getItem('currentUser')));

// Firebase services
console.log('Firebase Services:', window.firebaseServices?.currentUser);
```

### **Check Role Validation:**
```javascript
// Test role checking
if (currentUser && currentUser.role) {
    console.log('✅ Role exists:', currentUser.role);
    console.log('✅ Valid role:', ['student', 'staff'].includes(currentUser.role));
} else {
    console.log('❌ Role missing or invalid');
}
```

## 📞 **Step 9: Still Having Issues?**

### **Check These Common Problems:**
1. **Firebase Rules** - Ensure database rules allow read/write
2. **Network Issues** - Check internet connection
3. **Browser Cache** - Clear cache and cookies
4. **Firebase Project** - Verify correct project is selected
5. **Authentication** - Ensure user is properly authenticated

### **Debug Information to Collect:**
- Browser console errors
- Firebase database user record
- Current user object from all sources
- Role checking function results
- Permission test results

## ✅ **Success Indicators**

### **When Staff Login is Working:**
- ✅ Console shows "Staff user detected - validating permissions"
- ✅ `currentUser.role` equals `"staff"`
- ✅ `hasRole('staff')` returns `true`
- ✅ Staff can create assignments, announcements, schedules
- ✅ Students cannot access staff-only functions
- ✅ Role is properly synced across all systems

---

## **Quick Commands for Console:**

```javascript
// Debug current state
debugCurrentUser();

// Force sync
syncCurrentUser();

// Check role
console.log('Role:', currentUser?.role);

// Test permissions
requireRole('staff', 'create assignments');
```

**Remember:** Always check the browser console first - it contains the most detailed error information!

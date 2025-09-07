// ===== FIREBASE INTEGRATION =====
// Firebase configuration and initialization
let firebaseAuth, firebaseDb;

// Initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb && window.firebaseServices) {
            firebaseAuth = window.firebaseAuth;
            firebaseDb = window.firebaseDb;
            clearInterval(checkFirebase);
            
            // Set up Firebase auth state listener
            setupFirebaseAuthListener();
            
            // Initialize the app
            initializeApp();
        }
    }, 100);
});

// ===== UI UTILITIES =====
// Show alert/notification function
function showAlert(message, type = 'info', duration = 5000) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-toast');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert-toast alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-icon">
            <i class="fas ${getAlertIcon(type)}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-message">${message}</div>
        </div>
        <button type="button" class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
        box-shadow: var(--shadow-lg);
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => alert.remove(), 300);
            }
        }, duration);
    }
    
    return alert;
}

// Get alert icon based on type
function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': 
        default: return 'fa-info-circle';
    }
}

// Show loading state
function showLoading(element, text = 'Loading...') {
    if (!element) return;
    
    const originalContent = element.innerHTML;
    element.disabled = true;
    element.innerHTML = `
        <span class="loading"></span>
        <span>${text}</span>
    `;
    
    return () => {
        element.disabled = false;
        element.innerHTML = originalContent;
    };
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Format time for display
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check if date is overdue
function isOverdue(dueDate) {
    return new Date(dueDate) < new Date();
}

// Check if date is due soon (within 24 hours)
function isDueSoon(dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 24;
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'pending': return 'badge-warning';
        case 'submitted': return 'badge-info';
        case 'graded': return 'badge-success';
        case 'overdue': return 'badge-error';
        case 'approved': return 'badge-success';
        case 'rejected': return 'badge-error';
        case 'under_review': return 'badge-info';
        default: return 'badge-gray';
    }
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .alert-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        margin-bottom: var(--space-2);
        border: 1px solid;
    }
    
    .alert-toast .alert-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: var(--space-1);
        border-radius: var(--radius-sm);
        transition: background-color var(--transition-normal);
        margin-left: auto;
    }
    
    .alert-toast .alert-close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
    
    .loading {
        display: inline-block;
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--gray-200);
        border-radius: 50%;
        border-top-color: var(--primary-500);
        animation: spin 1s ease-in-out infinite;
        margin-right: var(--space-2);
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ===== FIREBASE AUTHENTICATION FUNCTIONS =====
async function registerUser(email, password, role) {
    try {
        console.log(`🔄 Registering new ${role} user: ${email}`);
        
        // Validate and set default role
        if (!role || (role !== 'student' && role !== 'staff')) {
            role = 'student'; // Default to student if no valid role
            console.log(`⚠️ Invalid role provided, defaulting to: ${role}`);
        }
        
        // Import Firebase auth functions
        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        // Store user data in unified /users/{uid} structure
        const userData = {
            uid: user.uid,
            name: email.split('@')[0], // Use email prefix as display name
            email: user.email,
            role: role,
            department: 'General', // Default department
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        // Validate user.uid is a string
        if (!user.uid || typeof user.uid !== 'string') {
            throw new Error(`Invalid user UID: ${user.uid} (type: ${typeof user.uid})`);
        }
        
        // Store user profile in appropriate collection based on role
        if (role === 'staff') {
            await addDataWithTimestamp('staff', user.uid, userData);
            console.log(`✅ Staff user registered successfully in Firebase: /staff/${user.uid}`);
        } else {
            await addDataWithTimestamp('students', user.uid, userData);
            console.log(`✅ Student user registered successfully in Firebase: /students/${user.uid}`);
        }
        
        // Store user info with proper structure
        const userInfo = {
            uid: user.uid,
            email: user.email,
            name: userData.name,
            role: role,
            department: userData.department
        };
        
        // Use the new setCurrentUser function to ensure proper synchronization
        setCurrentUser(userInfo);
        
        return { success: true, user: userInfo };
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(email, password, portal = null) {
    try {
        console.log(`🔐 Universal login for: ${email} (Portal: ${portal || 'auto-detect'})`);
        
        // If portal is specified, use the appropriate login function
        if (portal === 'staff') {
            return await loginStaffPortal(email, password);
        } else if (portal === 'student') {
            return await loginStudentPortal(email, password);
        }
        
        // Auto-detect portal by checking both collections
        console.log(`🔍 Auto-detecting portal for user: ${email}`);
        
        // Import Firebase auth functions
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        console.log(`✅ Firebase authentication successful for: ${user.email}`);
        
        // Check both collections to determine user type
        console.log(`🔍 Checking staff collection: /staff/${user.uid}`);
        let staffData = await getData('staff', user.uid);
        
        if (staffData) {
            console.log(`📊 User found in staff collection - redirecting to staff portal`);
            return await loginStaffPortal(email, password);
        }
        
        console.log(`🔍 Checking students collection: /students/${user.uid}`);
        let studentData = await getData('students', user.uid);
        
        if (studentData) {
            console.log(`📊 User found in students collection - redirecting to student portal`);
            return await loginStudentPortal(email, password);
        }
        
        // User not found in either collection
        console.log(`❌ User not found in any collection for UID: ${user.uid}`);
        return { success: false, error: 'User account not found. Please contact administrator to set up your account.' };
        
    } catch (error) {
        console.error('❌ Universal login error:', error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        // Import Firebase auth functions
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign out from Firebase
        await signOut(firebaseAuth);
        
        // Clear local storage
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        
        // Reset global state
        currentUser = null;
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// ===== FIREBASE REALTIME DATABASE FUNCTIONS =====
async function addData(path, data) {
    try {
        // Import Realtime Database functions
        const { ref, set, push } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        // Ensure path is a valid string
        const cleanPath = String(path).trim();
        
        // Validate path
        if (!cleanPath) {
            throw new Error(`Invalid path: "${cleanPath}"`);
        }
        
        // If data has an ID, use set, otherwise use push to generate a new key
        if (data.id) {
            const cleanId = String(data.id).trim();
            if (!cleanId) {
                throw new Error(`Invalid data.id: "${cleanId}"`);
            }
            
            const dbRef = ref(firebaseDb, `${cleanPath}/${cleanId}`);
            console.log(`📝 Adding data to Firebase: ${cleanPath}/${cleanId}`);
            await set(dbRef, data);
            return cleanId;
        } else {
            const dbRef = ref(firebaseDb, cleanPath);
            const newRef = push(dbRef);
            console.log(`📝 Adding data to Firebase: ${cleanPath}/${newRef.key}`);
            await set(newRef, data);
            return newRef.key;
        }
    } catch (error) {
        console.error('Error adding data:', error);
        throw error;
    }
}

async function getData(path, id = null) {
    try {
        // Import Realtime Database functions
        const { ref, get, query, orderByChild, limitToLast } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        // Ensure path is a valid string
        const cleanPath = String(path).trim();
        
        // Validate path
        if (!cleanPath) {
            throw new Error(`Invalid path: "${cleanPath}"`);
        }
        
        if (id) {
            // Get single record
            const cleanId = String(id).trim();
            if (!cleanId) {
                throw new Error(`Invalid id: "${cleanId}"`);
            }
            
            const dbRef = ref(firebaseDb, `${cleanPath}/${cleanId}`);
            console.log(`📖 Reading from Firebase: ${cleanPath}/${cleanId}`);
            const snapshot = await get(dbRef);
            
            if (snapshot.exists()) {
                return { id: snapshot.key, ...snapshot.val() };
            } else {
                return null;
            }
        } else {
            // Get all records at path
            const dbRef = ref(firebaseDb, cleanPath);
            console.log(`📖 Reading from Firebase: ${cleanPath}`);
            const snapshot = await get(dbRef);
            
            const records = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    records.push({ id: childSnapshot.key, ...childSnapshot.val() });
                });
            }
            
            return records;
        }
    } catch (error) {
        console.error('Error getting data:', error);
        throw error;
    }
}

async function updateData(path, id, data) {
    try {
        // Import Realtime Database functions
        const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        // Ensure path and id are valid strings
        const cleanPath = String(path).trim();
        const cleanId = String(id).trim();
        
        // Validate path and id
        if (!cleanPath || !cleanId) {
            throw new Error(`Invalid path or id: path="${cleanPath}", id="${cleanId}"`);
        }
        
        // Build the database reference
        const dbRef = ref(firebaseDb, `${cleanPath}/${cleanId}`);
        
        console.log(`🔄 Updating Firebase: ${cleanPath}/${cleanId}`);
        await update(dbRef, data);
        return true;
    } catch (error) {
        console.error('Error updating data:', error);
        throw error;
    }
}

async function deleteData(path, id) {
    try {
        // Import Realtime Database functions
        const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        // Ensure path and id are valid strings
        const cleanPath = String(path).trim();
        const cleanId = String(id).trim();
        
        // Validate path and id
        if (!cleanPath || !cleanId) {
            throw new Error(`Invalid path or id: path="${cleanPath}", id="${cleanId}"`);
        }
        
        // Build the database reference
        const dbRef = ref(firebaseDb, `${cleanPath}/${cleanId}`);
        
        console.log(`🗑️ Deleting from Firebase: ${cleanPath}/${cleanId}`);
        await remove(dbRef);
        return true;
    } catch (error) {
        console.error('Error deleting data:', error);
        throw error;
    }
}

// ===== ENHANCED FIREBASE FUNCTIONS =====
// Helper function to build and validate Firebase paths
function buildFirebasePath(basePath, id) {
    // Ensure basePath and id are valid strings
    const cleanBasePath = String(basePath).trim();
    const cleanId = String(id).trim();
    
    // Validate inputs
    if (!cleanBasePath) {
        throw new Error(`Invalid base path: "${cleanBasePath}"`);
    }
    if (!cleanId) {
        throw new Error(`Invalid ID: "${cleanId}"`);
    }
    
    // Build the path
    const fullPath = `${cleanBasePath}/${cleanId}`;
    console.log(`🔗 Building Firebase path: ${fullPath}`);
    
    return { basePath: cleanBasePath, id: cleanId, fullPath };
}

async function addDataWithTimestamp(path, id, data) {
    try {
        // Validate and build the path
        const { basePath, id: cleanId } = buildFirebasePath(path, id);
        
        const dataWithTimestamp = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Use addData with the validated path and id
        return await addData(basePath, { ...dataWithTimestamp, id: cleanId });
    } catch (error) {
        console.error('Error adding data with timestamp:', error);
        throw error;
    }
}

async function updateDataWithTimestamp(path, id, data) {
    try {
        // Validate and build the path
        const { basePath, id: cleanId } = buildFirebasePath(path, id);
        
        const dataWithTimestamp = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        // Use updateData with the validated path and id
        return await updateData(basePath, cleanId, dataWithTimestamp);
    } catch (error) {
        console.error('Error updating data with timestamp:', error);
        throw error;
    }
}

async function getDataByUser(path, userId) {
    try {
        const { ref, get, query, orderByChild, equalTo } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
        
        // Ensure path and userId are valid strings
        const cleanPath = String(path).trim();
        const cleanUserId = String(userId).trim();
        
        // Validate path and userId
        if (!cleanPath || !cleanUserId) {
            throw new Error(`Invalid path or userId: path="${cleanPath}", userId="${cleanUserId}"`);
        }
        
        const dbRef = ref(firebaseDb, cleanPath);
        const q = query(dbRef, orderByChild('userId'), equalTo(cleanUserId));
        console.log(`👤 Getting user data from Firebase: ${cleanPath} for user: ${cleanUserId}`);
        const snapshot = await get(q);
        
        const records = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                records.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
        
        return records;
    } catch (error) {
        console.error('Error getting data by user:', error);
        throw error;
    }
}

// Helper function to get user data from Realtime Database
async function getUserData(uid) {
    try {
        // Validate uid is a string
        if (!uid || typeof uid !== 'string') {
            throw new Error(`Invalid UID: ${uid} (type: ${typeof uid})`);
        }
        
        // Try to get user data from both students and staff collections
        let userData = await getData('students', uid);
        if (!userData) {
            userData = await getData('staff', uid);
        }
        return userData;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// ===== REALTIME DATABASE INTEGRATION FUNCTIONS =====
// Load data from Realtime Database
async function loadDataFromFirebase() {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            console.log('⚠️ Firebase services not available, skipping data load');
            return;
        }
        
        console.log('🔄 Loading data from Firebase Realtime Database...');
        
        // Load assignments
        const assignmentsData = await getAssignmentsFromFirebase();
        if (assignmentsData && assignmentsData.length > 0) {
            assignments = assignmentsData;
            localStorage.setItem('assignments', JSON.stringify(assignments));
            console.log(`✅ Loaded ${assignments.length} assignments from Firebase`);
        }
        
        // Load submissions
        const submissionsData = await window.firebaseServices.getSubmissions();
        if (submissionsData && submissionsData.length > 0) {
            submissions = submissionsData;
            localStorage.setItem('submissions', JSON.stringify(submissions));
            console.log(`✅ Loaded ${submissions.length} submissions from Firebase`);
        }
        
        // Load MCQ assignments (fallback to local storage for now)
        const savedMcqAssignments = localStorage.getItem('mcqAssignments');
        if (savedMcqAssignments) {
            mcqAssignments = JSON.parse(savedMcqAssignments);
        }
        
        // Load applications
        const applicationsData = await getApplicationsFromFirebase();
        if (applicationsData && applicationsData.length > 0) {
            applications = applicationsData;
            localStorage.setItem('applications', JSON.stringify(applications));
            console.log(`✅ Loaded ${applications.length} applications from Firebase`);
        }
        
        // Load announcements
        const announcementsData = await getAnnouncementsFromFirebase();
        if (announcementsData && announcementsData.length > 0) {
            announcements = announcementsData;
            localStorage.setItem('announcements', JSON.stringify(announcements));
            console.log(`✅ Loaded ${announcements.length} announcements from Firebase`);
        }
        
        // Load schedule events
        const scheduleData = await getSchedulesFromFirebase();
        if (scheduleData && scheduleData.length > 0) {
            scheduleEvents = scheduleData;
            localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents));
            console.log(`✅ Loaded ${scheduleEvents.length} schedule events from Firebase`);
        }
        
        // Load users
        const usersData = await window.firebaseServices.getAllUsers();
        if (usersData && usersData.length > 0) {
            users = usersData.map(user => ({
                id: user.uid || user.id,
                name: user.name || user.displayName,
                email: user.email,
                role: user.role,
                phone: user.phone || null
            }));
            console.log(`✅ Loaded ${users.length} users from Firebase`);
        }
        
        console.log('✅ All data loaded from Firebase Realtime Database');
    } catch (error) {
        console.error('❌ Error loading data from Firebase:', error);
    }
}

// Save data to Realtime Database
async function saveDataToFirebase(dataType, data) {
    try {
        if (!firebaseDb) return;
        
        console.log(`💾 Saving ${dataType} to Firebase...`);
        
        switch (dataType) {
            case 'assignments':
                await addDataWithTimestamp('assignments', data);
                break;
            case 'submissions':
                await addDataWithTimestamp('submissions', data);
                break;
            case 'mcqAssignments':
                await addDataWithTimestamp('mcqAssignments', data);
                break;
            case 'applications':
                await addDataWithTimestamp('applications', data);
                break;
            case 'announcements':
                await addDataWithTimestamp('announcements', data);
                break;
            case 'schedules':
                await addDataWithTimestamp('schedules', data);
                break;
            case 'students':
                await addDataWithTimestamp('students', data);
                break;
            case 'staff':
                await addDataWithTimestamp('staff', data);
                break;
            default:
                console.warn('⚠️ Unknown data type:', dataType);
        }
        
        console.log(`✅ ${dataType} saved to Firebase Realtime Database`);
        
        // Reload data from Firebase to keep local state in sync
        await loadDataFromFirebase();
        
    } catch (error) {
        console.error(`❌ Error saving ${dataType} to Firebase:`, error);
        throw error;
    }
}

// Update data in Realtime Database
async function updateDataInFirebase(dataType, id, data) {
    try {
        if (!firebaseDb) return;
        
        switch (dataType) {
            case 'assignments':
                await updateDataWithTimestamp('assignments', id, data);
                break;
            case 'submissions':
                await updateDataWithTimestamp('submissions', id, data);
                break;
            case 'mcqAssignments':
                await updateDataWithTimestamp('mcqAssignments', id, data);
                break;
            case 'applications':
                await updateDataWithTimestamp('applications', id, data);
                break;
            case 'announcements':
                await updateDataWithTimestamp('announcements', id, data);
                break;
            case 'schedules':
                await updateDataWithTimestamp('schedules', id, data);
                break;
            case 'students':
                await updateDataWithTimestamp('students', id, data);
                break;
            case 'staff':
                await updateDataWithTimestamp('staff', id, data);
                break;
            default:
                console.warn('⚠️ Unknown data type:', dataType);
        }
        
        console.log(`✅ ${dataType} updated in Firebase Realtime Database`);
        
        // Reload data from Firebase to keep local state in sync
        await loadDataFromFirebase();
        
    } catch (error) {
        console.error(`❌ Error updating ${dataType} in Firebase:`, error);
        throw error;
    }
}

// Delete data from Realtime Database
async function deleteDataFromFirebase(dataType, id) {
    try {
        if (!firebaseDb) return;
        
        switch (dataType) {
            case 'assignments':
                await deleteData('assignments', id);
                break;
            case 'submissions':
                await deleteData('submissions', id);
                break;
            case 'mcqAssignments':
                await deleteData('mcqAssignments', id);
                break;
            case 'applications':
                await deleteData('applications', id);
                break;
            case 'announcements':
                await deleteData('announcements', id);
                break;
            case 'schedules':
                await deleteData('schedules', id);
                break;
            case 'students':
                await deleteData('students', id);
                break;
            case 'staff':
                await deleteData('staff', id);
                break;
            default:
                console.warn('⚠️ Unknown data type:', dataType);
        }
        
        console.log(`✅ ${dataType} deleted from Firebase Realtime Database`);
        
        // Reload data from Firebase to keep local state in sync
        await loadDataFromFirebase();
        
    } catch (error) {
        console.error(`❌ Error deleting ${dataType} in Firebase:`, error);
        throw error;
    }
}

// ===== FIREBASE AUTH STATE LISTENER =====
function setupFirebaseAuthListener() {
    if (!firebaseAuth) return;
    
    import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                console.log('👤 User signed in:', user.email);
                
                // Fetch user data from Firebase
                try {
                    const userData = await getData('users', user.uid);
                    if (userData) {
                        // Update currentUser with Firebase data using proper structure
                        const userInfo = {
                            uid: user.uid,
                            email: user.email,
                            name: userData.name || userData.displayName || user.email.split('@')[0],
                            role: userData.role || 'student',
                            department: userData.department || 'General'
                        };
                        
                        // Use the new setCurrentUser function to ensure proper synchronization
                        setCurrentUser(userInfo);
                        
                        console.log(`✅ Auth state updated: ${currentUser.role} - ${currentUser.name}`);
                        console.log(`🔐 Current user role: ${currentUser.role}`);
                        
                        // Update UI if app is initialized
                        if (typeof updateUserInterface === 'function') {
                            updateUserInterface();
                        }
                    } else {
                        console.warn('⚠️ User data not found in Firebase during auth state change');
                    }
                } catch (error) {
                    console.error('❌ Error fetching user data during auth state change:', error);
                }
            } else {
                console.log('👤 User signed out');
                currentUser = null;
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('currentUser');
                
                // Update Firebase services currentUser if available
                if (window.firebaseServices) {
                    window.firebaseServices.currentUser = null;
                }
                
                // Update UI if app is initialized
                if (typeof updateUserInterface === 'function') {
                    updateUserInterface();
                }
            }
        });
    });
}

// ===== FIREBASE MODULE INTEGRATION FUNCTIONS =====

// Assignment Module Integration
async function createAssignmentWithFirebase(assignmentData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.createAssignment(assignmentData);
        if (result.success) {
            console.log('✅ Assignment created with Firebase:', result.assignmentId);
            // Refresh assignments list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error creating assignment with Firebase:', error);
        throw error;
    }
}

async function getAssignmentsFromFirebase() {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const assignments = await window.firebaseServices.getAssignments();
        return assignments;
    } catch (error) {
        console.error('❌ Error getting assignments from Firebase:', error);
        return [];
    }
}

async function submitAssignmentWithFirebase(assignmentId, submissionData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.submitAssignment(assignmentId, submissionData);
        if (result.success) {
            console.log('✅ Assignment submitted with Firebase:', result.submissionId);
            // Refresh submissions list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error submitting assignment with Firebase:', error);
        throw error;
    }
}

// Application Module Integration
async function createApplicationWithFirebase(applicationData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.createApplication(applicationData);
        if (result.success) {
            console.log('✅ Application created with Firebase:', result.applicationId);
            // Refresh applications list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error creating application with Firebase:', error);
        throw error;
    }
}

async function getApplicationsFromFirebase() {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const applications = await window.firebaseServices.getApplications();
        return applications;
    } catch (error) {
        console.error('❌ Error getting applications from Firebase:', error);
        return [];
    }
}

async function updateApplicationStatusWithFirebase(applicationId, status, comment = '') {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.updateApplicationStatus(applicationId, status, comment);
        if (result.success) {
            console.log('✅ Application status updated with Firebase:', status);
            // Refresh applications list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error updating application status with Firebase:', error);
        throw error;
    }
}

// Announcement Module Integration
async function createAnnouncementWithFirebase(announcementData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.createAnnouncement(announcementData);
        if (result.success) {
            console.log('✅ Announcement created with Firebase:', result.announcementId);
            // Refresh announcements list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error creating announcement with Firebase:', error);
        throw error;
    }
}

async function getAnnouncementsFromFirebase() {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const announcements = await window.firebaseServices.getAnnouncements();
        return announcements;
    } catch (error) {
        console.error('❌ Error getting announcements from Firebase:', error);
        return [];
    }
}

// Schedule Module Integration
async function createScheduleWithFirebase(scheduleData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.createSchedule(scheduleData);
        if (result.success) {
            console.log('✅ Schedule event created with Firebase:', result.scheduleId);
            // Refresh schedules list
            await loadDataFromFirebase();
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Error creating schedule event with Firebase:', error);
        throw error;
    }
}

async function getSchedulesFromFirebase() {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        const schedules = await window.firebaseServices.getSchedules();
        return schedules;
    } catch (error) {
        console.error('❌ Error getting schedules from Firebase:', error);
        return [];
    }
}

// User Management Integration
async function getUserProfileFromFirebase(uid) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const userProfile = await window.firebaseServices.getUserProfile(uid);
        return userProfile;
    } catch (error) {
        console.error('❌ Error getting user profile from Firebase:', error);
        return null;
    }
}

async function updateUserProfileWithFirebase(uid, profileData) {
    try {
        if (!window.firebaseServices || !window.firebaseServices.isInitialized) {
            throw new Error('Firebase services not available');
        }
        
        const result = await window.firebaseServices.updateUserProfile(uid, profileData);
        return result;
    } catch (error) {
        console.error('❌ Error updating user profile with Firebase:', error);
        throw error;
    }
}

// ===== UI HELPER FUNCTIONS =====
function showAuthStatus(message, type = 'success') {
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        authStatus.textContent = message;
        authStatus.className = `auth-status ${type}`;
        authStatus.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            authStatus.classList.add('hidden');
        }, 5000);
    }
}

function toggleRegistrationForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registrationSection = document.querySelector('.registration-section');
    const loginHeader = document.querySelector('.login-form > .form-header');
    
    if (registerForm.classList.contains('hidden')) {
        // Show registration form
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registrationSection.classList.add('hidden');
        if (loginHeader) loginHeader.classList.add('hidden');
    } else {
        // Show login form
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        registrationSection.classList.remove('hidden');
        if (loginHeader) loginHeader.classList.remove('hidden');
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
    currentView = 'login';
}

// ===== GLOBAL STATE MANAGEMENT =====
let currentUser = null;
let currentView = 'dashboard';
let assignments = [];
let submissions = [];
let mcqAssignments = [];
let applications = [];
let notifications = [];
let scheduleEvents = [];
let announcements = [];
let users = [];
let isDarkMode = false;

// ===== CURRENT USER MANAGEMENT =====
/**
 * Get the current user with proper structure
 * @returns {Object|null} Current user object with uid, name, role, and email
 */
function getCurrentUser() {
    if (!currentUser) {
        // Try to load from localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
            } catch (error) {
                console.error('Error parsing currentUser from localStorage:', error);
                return null;
            }
        }
    }
    return currentUser;
}

/**
 * Set the current user and sync across all systems
 * @param {Object} user - User object with uid, name, role, email
 */
function setCurrentUser(user) {
    if (!user || !user.uid) {
        console.error('Invalid user object provided to setCurrentUser');
        return false;
    }
    
    // Ensure proper structure
    currentUser = {
        uid: user.uid,
        id: user.uid, // Keep both for backward compatibility
        name: user.name || user.displayName || user.email?.split('@')[0] || 'Unknown User',
        role: user.role || 'student',
        email: user.email,
        department: user.department || 'General',
        portal: user.portal || user.role
    };
    
    // Sync to localStorage and sessionStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Sync to Firebase services if available
    if (window.firebaseServices) {
        window.firebaseServices.currentUser = currentUser;
        // Also call the sync method to ensure proper synchronization
        if (typeof window.firebaseServices.syncCurrentUser === 'function') {
            window.firebaseServices.syncCurrentUser();
        }
    }
    
    console.log('✅ Current user synchronized:', currentUser);
    return true;
}

/**
 * Check if current user is available and has required role
 * @param {string} requiredRole - Required role ('staff' or 'student')
 * @param {string} operation - Operation being performed (for error message)
 * @returns {boolean} True if user has required role
 */
function requireCurrentUser(requiredRole, operation) {
    const user = getCurrentUser();
    if (!user) {
        showConfirmation('Authentication Error', 'User not logged in or role not found. Please log in again.', 'error');
        return false;
    }
    
    if (user.role !== requiredRole) {
        showConfirmation('Permission Denied', `Only ${requiredRole}s can ${operation}`, 'error');
        return false;
    }
    
    return true;
}

/**
 * Get createdBy object for database operations
 * @returns {Object} createdBy object with uid, name, and role
 */
function getCreatedByObject() {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not logged in or role not found');
    }
    
    return {
        uid: user.uid,
        name: user.name,
        role: user.role
    };
}

// ===== MOCK DATA =====
const mockData = {
    assignments: [
        {
            id: '1',
            title: 'Introduction to Web Development',
            description: 'Create a simple HTML page with CSS styling and basic JavaScript functionality. Focus on responsive design principles.',
            dueDate: '2024-02-15',
            status: 'pending',
            subject: 'Web Development',
            maxScore: 100,
            createdBy: 'staff1',
            createdAt: '2024-01-15'
        },
        {
            id: '2',
            title: 'JavaScript Fundamentals',
            description: 'Complete exercises on JavaScript basics including variables, functions, arrays, and object-oriented programming concepts.',
            dueDate: '2024-02-20',
            status: 'submitted',
            subject: 'Programming',
            maxScore: 100,
            submittedAt: '2024-02-18',
            createdBy: 'staff1',
            createdAt: '2024-01-20'
        },
        {
            id: '3',
            title: 'Database Design Principles',
            description: 'Design a normalized database schema for an e-commerce system with proper relationships and constraints.',
            dueDate: '2024-02-25',
            status: 'graded',
            subject: 'Database Systems',
            maxScore: 100,
            grade: 85,
            feedback: 'Excellent normalization work. Consider adding indexes for better performance.',
            createdBy: 'staff1',
            createdAt: '2024-01-25'
        }
    ],
    mcqAssignments: [
        {
            id: 'mcq1',
            title: 'Programming Basics Quiz',
            description: 'Test your knowledge of programming fundamentals including variables, data types, and control structures.',
            dueDate: '2024-02-25',
            subject: 'Programming',
            questions: [
                {
                    id: 'q1',
                    question: 'What is a variable in programming?',
                    options: ['A storage location for data', 'A function that performs calculations', 'A loop that repeats code', 'A condition that checks values'],
                    correctAnswer: 'A storage location for data',
                    points: 10
                },
                {
                    id: 'q2',
                    question: 'Which keyword is used to declare a variable in JavaScript?',
                    options: ['var', 'let', 'const', 'All of the above'],
                    correctAnswer: 'All of the above',
                    points: 10
                },
                {
                    id: 'q3',
                    question: 'What is the purpose of a function in programming?',
                    options: ['To store data', 'To repeat code', 'To organize and reuse code', 'To create variables'],
                    correctAnswer: 'To organize and reuse code',
                    points: 10
                }
            ],
            totalPoints: 30,
            timeLimit: 30,
            allowRetake: true,
            showCorrectAnswers: true,
            createdBy: 'staff1',
            createdAt: '2024-01-25'
        }
    ],
    applications: [
        {
            id: 'app1',
            type: 'internship',
            title: 'Summer Software Development Internship',
            description: 'Application for a 12-week summer internship in software development at TechCorp. Gain hands-on experience with modern web technologies.',
            deadline: '2024-03-01',
            status: 'submitted',
            submittedBy: 'student1',
            submittedAt: '2024-02-01'
        },
        {
            id: 'app2',
            type: 'scholarship',
            title: 'Academic Excellence Scholarship',
            description: 'Merit-based scholarship for students maintaining a GPA of 3.8 or higher. Covers tuition and provides additional academic support.',
            deadline: '2024-03-15',
            status: 'under_review',
            submittedBy: 'student1',
            submittedAt: '2024-02-10'
        }
    ],
    announcements: [
        {
            id: 'ann1',
            title: 'Welcome to Spring Semester 2024',
            content: 'Welcome back students! Classes begin next week. Please check your course schedules and ensure all prerequisites are met. The library will be open extended hours during the first two weeks.',
            type: 'general',
            priority: 'medium',
            targetAudience: 'all',
            isPublished: true,
            publishDate: '2024-01-20',
            createdBy: 'staff1',
            createdAt: '2024-01-20',
            readBy: []
        },
        {
            id: 'ann2',
            title: 'Career Fair Registration Now Open',
            content: 'The annual Spring Career Fair will be held on March 15th. Over 50 companies will be attending. Register now to secure your spot and prepare your resume.',
            type: 'event',
            priority: 'high',
            targetAudience: 'students',
            isPublished: true,
            publishDate: '2024-01-25',
            createdBy: 'staff1',
            createdAt: '2024-01-25',
            readBy: []
        }
    ],
    scheduleEvents: [
        {
            id: 'schedule1',
            title: 'Web Development Final Exam',
            description: 'Comprehensive exam covering HTML, CSS, JavaScript, and responsive design principles.',
            date: '2024-02-28',
            time: '14:00',
            category: 'exam',
            location: 'Room 101, Computer Science Building',
            priority: 'high',
            createdBy: 'staff1',
            createdAt: '2024-01-15'
        },
        {
            id: 'schedule2',
            title: 'JavaScript Fundamentals Lecture',
            description: 'Advanced JavaScript concepts including ES6+ features, async programming, and modern frameworks.',
            date: '2024-02-20',
            time: '10:00',
            category: 'lecture',
            location: 'Room 205, Engineering Building',
            priority: 'medium',
            createdBy: 'staff1',
            createdAt: '2024-01-20'
        },
        {
            id: 'schedule3',
            title: 'Database Assignment Deadline',
            description: 'Submit your normalized database schema design for the e-commerce system project.',
            date: '2024-02-25',
            time: '23:59',
            category: 'assignment',
            location: 'Online Submission',
            priority: 'urgent',
            createdBy: 'staff1',
            createdAt: '2024-01-25'
        },
        {
            id: 'schedule4',
            title: 'Student Council Meeting',
            description: 'Monthly meeting to discuss upcoming events, student concerns, and campus improvements.',
            date: '2024-02-22',
            time: '16:00',
            category: 'meeting',
            location: 'Student Union, Conference Room A',
            priority: 'low',
            createdBy: 'staff1',
            createdAt: '2024-01-30'
        },
        {
            id: 'schedule5',
            title: 'Career Fair 2024',
            description: 'Annual career fair featuring top tech companies, networking opportunities, and internship positions.',
            date: '2024-03-05',
            time: '09:00',
            category: 'event',
            location: 'Main Campus, Grand Hall',
            priority: 'high',
            createdBy: 'staff1',
            createdAt: '2024-02-01'
        }
    ],
    users: [
        {
            id: 'student1',
            name: 'Alex Johnson',
            email: 'alex.johnson@university.edu',
            role: 'student',
            phone: '+1 (555) 000-0000'
        },
        {
            id: 'staff1',
            name: 'Sarah Wilson',
            email: 'sarah.wilson@university.edu',
            role: 'staff'
        }
    ]
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupAccessibility();
});
    
function initializeApp() {
    loadData();
    setupEventListeners();
    showLoginPage();
    
    // Load data from Firebase Realtime Database if available
    if (firebaseDb) {
        loadDataFromFirebase();
    }
}

function loadData() {
    // Load from localStorage if available
    const savedNotifications = localStorage.getItem('notifications');
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedAssignments = localStorage.getItem('assignments');
    const savedSubmissions = localStorage.getItem('submissions');
    
    // Load current user using the new function
    currentUser = getCurrentUser();
    
    if (savedNotifications) {
        notifications = JSON.parse(savedNotifications);
    }
    
    if (savedDarkMode) {
        isDarkMode = JSON.parse(savedDarkMode);
        if (isDarkMode) {
            document.body.classList.add('dark');
        }
    }
    
    // Load assignments and submissions from localStorage or use mock data
    if (savedAssignments) {
        assignments = JSON.parse(savedAssignments);
    } else {
        assignments = mockData.assignments;
        localStorage.setItem('assignments', JSON.stringify(assignments));
    }
    
    if (savedSubmissions) {
        submissions = JSON.parse(savedSubmissions);
    } else {
        submissions = [];
        localStorage.setItem('submissions', JSON.stringify(submissions));
    }
    
    // Load applications from localStorage or use mock data
    const savedApplications = localStorage.getItem('applications');
    if (savedApplications) {
        applications = JSON.parse(savedApplications);
    } else {
        applications = mockData.applications;
        localStorage.setItem('applications', JSON.stringify(applications));
    }
    
    // Load announcements from localStorage or use mock data
    const savedAnnouncements = localStorage.getItem('announcements');
    if (savedAnnouncements) {
        announcements = JSON.parse(savedAnnouncements);
    } else {
        announcements = mockData.announcements;
        localStorage.setItem('announcements', JSON.stringify(announcements));
    }
    
    // Load schedules from localStorage or use mock data
    const savedSchedules = localStorage.getItem('scheduleEvents');
    if (savedSchedules) {
        scheduleEvents = JSON.parse(savedSchedules);
    } else {
        scheduleEvents = mockData.scheduleEvents || [];
        localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents));
    }
    
    // Load MCQ assignments from localStorage or use mock data
    const savedMcqAssignments = localStorage.getItem('mcqAssignments');
    if (savedMcqAssignments) {
        mcqAssignments = JSON.parse(savedMcqAssignments);
    } else {
        mcqAssignments = mockData.mcqAssignments;
        localStorage.setItem('mcqAssignments', JSON.stringify(mcqAssignments));
    }
    
    // Use mock data for users
    users = mockData.users;
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        setupFormValidation(loginForm);
    }
    
    // Registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
        setupFormValidation(registerForm);
    }
    
    // Role selection buttons (for both login and registration forms)
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Get the form this button belongs to
            const form = this.closest('form');
            const isRegistrationForm = form && form.id === 'registerForm';
            
            // Update only the buttons in the same form
            const formRoleButtons = form.querySelectorAll('.role-btn');
            formRoleButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            
            // Update password field type and hint (only for login form)
            if (!isRegistrationForm) {
                const passwordField = document.getElementById('password');
                const passwordHint = document.getElementById('password-hint');
                if (this.dataset.role === 'student') {
                    passwordField.type = 'tel';
                    passwordField.placeholder = 'Enter your phone number';
                    passwordHint.textContent = 'Students use their phone number as password';
                } else {
                    passwordField.type = 'password';
                    passwordField.placeholder = 'Enter your password';
                    passwordHint.textContent = 'Enter your staff password';
                }
            }
        });
    });
    
    // Notification button
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleNotificationPanel);
    }
    
    // Click outside notification panel to close
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.notifications')) {
            const panel = document.getElementById('notificationPanel');
            if (panel) {
                panel.classList.add('hidden');
                const btn = document.getElementById('notificationBtn');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function setupAccessibility() {
    // Add skip link for keyboard users
    const skipLink = document.createElement('a');
    skipLink.href = '#mainApp';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-600);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.3s;
    `;
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Announce page changes for screen readers
    const announcePageChange = (message) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    };
    
    window.announcePageChange = announcePageChange;
}

function setupFormValidation(form) {
    const inputs = form.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function validateField(e) {
    const field = e.target;
    const errorId = field.getAttribute('aria-describedby');
    const errorElement = document.getElementById(errorId);
    
    if (!errorElement) return;
    
    let isValid = true;
    let errorMessage = '';
    
    if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    
    if (field.required && !field.value.trim()) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    if (!isValid) {
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
        field.setAttribute('aria-invalid', 'true');
    } else {
        errorElement.classList.add('hidden');
        field.setAttribute('aria-invalid', 'false');
    }
}

function clearFieldError(e) {
    const field = e.target;
    const errorId = field.getAttribute('aria-describedby');
    const errorElement = document.getElementById(errorId);
    
    if (errorElement) {
        errorElement.classList.add('hidden');
        field.setAttribute('aria-invalid', 'false');
    }
}

function handleKeyboardNavigation(e) {
    // Escape key closes modals and panels
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal:not(.hidden)');
        if (modal) {
            closeModal();
        }
        
        const panel = document.getElementById('notificationPanel');
        if (panel && !panel.classList.contains('hidden')) {
            panel.classList.add('hidden');
            const btn = document.getElementById('notificationBtn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    }
    
    // Tab key navigation improvements
    if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (e.shiftKey && document.activeElement === focusableElements[0]) {
            e.preventDefault();
            focusableElements[focusableElements.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === focusableElements[focusableElements.length - 1]) {
            e.preventDefault();
            focusableElements[0].focus();
        }
    }
}

// ===== PAGE MANAGEMENT =====
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
    
    // Focus first input for accessibility
    setTimeout(() => {
        const firstInput = document.querySelector('#loginPage input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    updateUserInfo();
    setupNavigation();
    showView('dashboard');
    
    // Announce page change for screen readers
    if (window.announcePageChange) {
        window.announcePageChange(`Welcome to ${currentUser.role} portal`);
    }
}

// ===== AUTHENTICATION =====
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const roleBtn = document.querySelector('.role-btn.active');
    const selectedRole = roleBtn ? roleBtn.dataset.role : 'student';
    
    // Clear previous errors
    clearLoginErrors();
    
    // Validation
    if (!email || !password) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn, 'Signing In...');
    
    try {
        // Try Firebase authentication with portal-based login
        if (firebaseAuth && firebaseDb) {
            console.log(`🔐 Attempting login for ${selectedRole} portal with email: ${email}`);
            
            // Use portal-specific login function
            const result = await loginUser(email, password, selectedRole);
            
            if (result.success) {
                currentUser = result.user;
                
                // Verify portal matches selected role
                if (currentUser.portal !== selectedRole) {
                    showAlert(`Portal mismatch: This account is registered in the ${currentUser.portal} portal, not the ${selectedRole} portal.`, 'error');
                    return;
                }
                
                console.log(`✅ Login successful for ${currentUser.role} portal: ${currentUser.name}`);
                showAlert(`Welcome back, ${currentUser.name}!`, 'success');
                loginSuccess();
                return;
            } else {
                // Firebase auth failed, try demo login as fallback
                if (selectedRole === 'student' && email === 'alex.johnson@university.edu' && password === '+1 (555) 000-0000') {
                    const userData = users.find(u => u.id === 'student1');
                    if (userData) {
                        const userInfo = {
                            uid: userData.id,
                            id: userData.id, // Keep for backward compatibility
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            department: userData.department || 'General',
                            portal: userData.role
                        };
                        setCurrentUser(userInfo);
                        loginSuccess();
                        return;
                    }
                } else if (selectedRole === 'staff' && email === 'sarah.wilson@university.edu' && password === 'staff123') {
                    const userData = users.find(u => u.id === 'staff1');
                    if (userData) {
                        const userInfo = {
                            uid: userData.id,
                            id: userData.id, // Keep for backward compatibility
                            email: userData.email,
                            name: userData.name,
                            role: userData.role,
                            department: userData.department || 'General',
                            portal: userData.role
                        };
                        setCurrentUser(userInfo);
                        loginSuccess();
                        return;
                    }
                } else {
                    showAlert(result.error || 'Invalid credentials. Please check your email and password.', 'error');
                    return;
                }
            }
        } else {
            // Firebase not available, use demo login
            if (selectedRole === 'student' && email === 'alex.johnson@university.edu' && password === '+1 (555) 000-0000') {
                currentUser = users.find(u => u.id === 'student1');
                loginSuccess();
            } else if (selectedRole === 'staff' && email === 'sarah.wilson@university.edu' && password === 'staff123') {
                currentUser = users.find(u => u.id === 'staff1');
                loginSuccess();
            } else {
                showAlert('Invalid credentials. Please check your email and password.', 'error');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login. Please try again.', 'error');
    } finally {
        // Reset button state
        if (stopLoading) stopLoading();
    }
}

function demoLogin(role) {
    const demoCredentials = {
        student: { email: 'alex.johnson@university.edu', password: '+1 (555) 000-0000' },
        staff: { email: 'sarah.wilson@university.edu', password: 'staff123' }
    };
    
    document.getElementById('email').value = demoCredentials[role].email;
    document.getElementById('password').value = demoCredentials[role].password;
    
    // Update role selection
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
        if (btn.dataset.role === role) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        }
    });
    
    // Update password field
    const passwordField = document.getElementById('password');
    if (role === 'student') {
        passwordField.type = 'tel';
    } else {
        passwordField.type = 'password';
    }
    
    // Store the selected portal for login
    document.getElementById('loginForm').setAttribute('data-portal', role);
}

function loginSuccess() {
    // currentUser is already set by setCurrentUser function
    showAlert(`Welcome back, ${currentUser.name}! You have successfully logged in to your ${currentUser.role} portal.`, 'success', 3000);
    
    // Small delay to show the success message before switching pages
    setTimeout(() => {
        showMainApp();
    }, 1000);
}

function clearLoginErrors() {
    const errorElements = document.querySelectorAll('#loginPage .error-message');
    errorElements.forEach(el => el.classList.add('hidden'));
    
    const inputs = document.querySelectorAll('#loginPage input');
    inputs.forEach(input => input.setAttribute('aria-invalid', 'false'));
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Focus the error message for screen readers
    errorDiv.focus();
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// ===== REGISTRATION HANDLER =====
function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const roleBtn = document.querySelector('#registerForm .role-btn.active');
    const role = roleBtn ? roleBtn.dataset.role : 'student';
    
    // Clear previous errors
    const registerError = document.getElementById('registerError');
    registerError.classList.add('hidden');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        showAlert('Please enter a valid email address', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const stopLoading = showLoading(submitBtn, 'Creating Account...');
    
    // Attempt to register with Firebase
    if (firebaseAuth && firebaseDb) {
        registerUser(email, password, role)
            .then(result => {
                if (result.success) {
                    showAlert('Account created successfully! You can now log in.', 'success');
                    
                    // Switch back to login form
                    setTimeout(() => {
                        toggleRegistrationForm();
                        // Pre-fill the email field
                        document.getElementById('email').value = email;
                        // Clear registration form
                        e.target.reset();
                    }, 2000);
                } else {
                    showAlert(result.error || 'Failed to create account. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showAlert('An error occurred during registration. Please try again.', 'error');
            })
            .finally(() => {
                // Reset button state
                if (stopLoading) stopLoading();
            });
    } else {
        showAlert('Registration service is not available. Please try again later.', 'error');
        if (stopLoading) stopLoading();
    }
}

function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Focus the error message for screen readers
    errorDiv.focus();
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// ===== USER INTERFACE =====
function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userRole').textContent = `${currentUser.role} Portal`;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    const countElement = document.getElementById('notificationCount');
    countElement.textContent = unreadCount;
    countElement.setAttribute('aria-label', `${unreadCount} unread notifications`);
    
    // Hide count if no notifications
    if (unreadCount === 0) {
        countElement.style.display = 'none';
    } else {
        countElement.style.display = 'block';
    }
}

function setupNavigation() {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';
    
    const navItems = currentUser.role === 'student' ? getStudentNavItems() : getStaffNavItems();
    
    navItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        const button = document.createElement('button');
        button.className = 'nav-btn';
        button.innerHTML = `<i class="${item.icon}" aria-hidden="true"></i><span>${item.label}</span>`;
        button.onclick = () => showView(item.id);
        button.setAttribute('aria-label', item.label);
        button.setAttribute('tabindex', '0');
        
        li.appendChild(button);
        navList.appendChild(li);
    });
    
    // Set first nav item as active
    const firstNavBtn = navList.querySelector('.nav-btn');
    if (firstNavBtn) {
        firstNavBtn.classList.add('active');
        firstNavBtn.setAttribute('aria-current', 'page');
    }
}

function getStudentNavItems() {
    return [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'assignments', label: 'Assignments', icon: 'fas fa-tasks' },
        { id: 'submission-history', label: 'Submission History', icon: 'fas fa-clock' },
        { id: 'applications', label: 'Applications', icon: 'fas fa-file-alt' },
        { id: 'announcements', label: 'Announcements', icon: 'fas fa-bell' },
        { id: 'schedule', label: 'My Schedule', icon: 'fas fa-calendar-alt' },
        { id: 'profile', label: 'Profile', icon: 'fas fa-user-circle' },
        { id: 'settings', label: 'Settings', icon: 'fas fa-sliders-h' }
    ];
}

function getStaffNavItems() {
    return [
        { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
        { id: 'assignments', label: 'Assignments', icon: 'fas fa-tasks' },
        { id: 'applications', label: 'Review Applications', icon: 'fas fa-file-alt' },
        { id: 'announcements', label: 'Announcements', icon: 'fas fa-bullhorn' },
        { id: 'students', label: 'Students', icon: 'fas fa-user-graduate' },
        { id: 'schedule', label: 'Schedule Management', icon: 'fas fa-calendar-alt' },
        { id: 'profile', label: 'Profile', icon: 'fas fa-user-circle' },
        { id: 'settings', label: 'Settings', icon: 'fas fa-sliders-h' }
    ];
}

function showView(viewName) {
    currentView = viewName;
    
    // Update navigation active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
    });
    
    const activeBtn = document.querySelector(`[onclick="showView('${viewName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-current', 'page');
    }
    
    // Render content based on view
    const contentArea = document.getElementById('contentArea');
    
    switch (viewName) {
        case 'dashboard':
            contentArea.innerHTML = renderDashboard();
            break;
        case 'assignments':
            contentArea.innerHTML = renderAssignments();
            break;
        case 'applications':
            contentArea.innerHTML = renderApplications();
            break;
        case 'announcements':
            contentArea.innerHTML = renderAnnouncements();
            break;
        case 'schedule':
            contentArea.innerHTML = renderSchedule();
            break;
        case 'profile':
            contentArea.innerHTML = renderProfile();
            break;
        case 'settings':
            contentArea.innerHTML = renderSettings();
            break;
        default:
            contentArea.innerHTML = renderDashboard();
    }
    
    // Announce view change for screen readers
    if (window.announcePageChange) {
        const viewLabel = activeBtn ? activeBtn.textContent.trim() : viewName;
        window.announcePageChange(`Now viewing ${viewLabel}`);
    }
    
    // Focus main content for accessibility
    contentArea.focus();
}

// ===== CONTENT RENDERING =====
function renderDashboard() {
    if (currentUser.role === 'student') {
        return renderStudentDashboard();
    } else {
        return renderStaffDashboard();
    }
}

function renderStudentDashboard() {
    const pendingAssignments = assignments.filter(a => a.status === 'pending');
    const submittedAssignments = assignments.filter(a => a.status === 'submitted');
    const userApplications = applications.filter(a => a.submittedBy === currentUser.id);
    
    return `
        <div class="dashboard" role="region" aria-label="Dashboard Overview">
            <div class="dashboard-card">
                <h3><i class="fas fa-clock" aria-hidden="true"></i>Pending Assignments</h3>
                <div class="stat-number" aria-label="${pendingAssignments.length} pending assignments">${pendingAssignments.length}</div>
                <div class="stat-label">Need to submit</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-check-circle" aria-hidden="true"></i>Submitted</h3>
                <div class="stat-number" aria-label="${submittedAssignments.length} submitted assignments">${submittedAssignments.length}</div>
                <div class="stat-label">Awaiting grade</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-file-alt" aria-hidden="true"></i>Applications</h3>
                <div class="stat-number" aria-label="${userApplications.length} applications">${userApplications.length}</div>
                <div class="stat-label">Total submitted</div>
            </div>
        </div>
        
        <div class="quick-actions" role="region" aria-label="Quick Actions">
            <button class="action-btn" onclick="showView('assignments')" aria-label="View all assignments">
                <i class="fas fa-tasks" aria-hidden="true"></i>
                <span>View Assignments</span>
            </button>
            <button class="action-btn" onclick="showView('applications')" aria-label="Submit new application">
                <i class="fas fa-plus" aria-hidden="true"></i>
                <span>Submit Application</span>
            </button>
            <button class="action-btn" onclick="showView('announcements')" aria-label="View announcements">
                <i class="fas fa-bell" aria-hidden="true"></i>
                <span>View Announcements</span>
            </button>
            <button class="action-btn" onclick="showView('schedule')" aria-label="View schedule">
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                <span>My Schedule</span>
            </button>
        </div>
        
        <div class="content-section">
            <h2><i class="fas fa-bell" aria-hidden="true"></i>Recent Announcements</h2>
            ${renderAnnouncementsList(announcements.slice(0, 3))}
        </div>
    `;
}

function renderStaffDashboard() {
    const totalAssignments = assignments.length;
    const totalApplications = applications.length;
    const totalStudents = users.filter(u => u.role === 'student').length;
    const pendingApplications = applications.filter(a => a.status === 'pending');
    
    return `
        <div class="dashboard" role="region" aria-label="Staff Dashboard Overview">
            <div class="dashboard-card">
                <h3><i class="fas fa-tasks" aria-hidden="true"></i>Total Assignments</h3>
                <div class="stat-number" aria-label="${totalAssignments} total assignments">${totalAssignments}</div>
                <div class="stat-label">Created assignments</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-file-alt" aria-hidden="true"></i>Applications</h3>
                <div class="stat-number" aria-label="${totalApplications} applications">${totalApplications}</div>
                <div class="stat-label">Total applications</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-clock" aria-hidden="true"></i>Pending Review</h3>
                <div class="stat-number" aria-label="${pendingApplications.length} pending applications">${pendingApplications.length}</div>
                <div class="stat-label">Need attention</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-user-graduate" aria-hidden="true"></i>Students</h3>
                <div class="stat-number" aria-label="${totalStudents} registered students">${totalStudents}</div>
                <div class="stat-label">Registered students</div>
            </div>
        </div>
        
        <div class="quick-actions" role="region" aria-label="Staff Quick Actions">
            <button class="action-btn" onclick="showView('assignments')" aria-label="Create new assignment">
                <i class="fas fa-plus" aria-hidden="true"></i>
                <span>Create Assignment</span>
            </button>
            <button class="action-btn" onclick="showView('applications')" aria-label="Review student applications">
                <i class="fas fa-eye" aria-hidden="true"></i>
                <span>Review Applications</span>
            </button>
            <button class="action-btn" onclick="showView('announcements')" aria-label="Create announcement">
                <i class="fas fa-bullhorn" aria-hidden="true"></i>
                <span>Create Announcement</span>
            </button>
            <button class="action-btn" onclick="showView('schedule')" aria-label="Manage schedule">
                <i class="fas fa-calendar-alt" aria-hidden="true"></i>
                <span>Manage Schedule</span>
            </button>
        </div>
        
        <div class="content-section">
            <h2><i class="fas fa-chart-line" aria-hidden="true"></i>Recent Activity</h2>
            <div class="recent-activity">
                <p>Welcome back, ${currentUser.name}! Here's what's happening today:</p>
                <ul>
                    <li>${pendingApplications.length} applications pending review</li>
                    <li>${totalAssignments} assignments created</li>
                    <li>${totalStudents} students registered</li>
                </ul>
            </div>
        </div>
    `;
}

function renderAssignments() {
    if (currentUser.role === 'student') {
        return renderStudentAssignments();
    } else {
        return renderStaffAssignments();
    }
}

function renderStudentAssignments() {
    const userSubmissions = submissions.filter(s => s.studentId === currentUser.id);
    
    return `
        <div class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-book-open" aria-hidden="true"></i>My Assignments</h2>
                <div class="assignment-filters">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Search assignments..." onkeyup="filterAssignments(this.value)">
                    </div>
                    <div class="filter-group">
                        <label>Subject</label>
                        <select onchange="filterAssignmentsBySubject(this.value)">
                            <option value="">All Subjects</option>
                            <option value="Web Development">Web Development</option>
                            <option value="Programming">Programming</option>
                            <option value="Database Systems">Database Systems</option>
                            <option value="Software Engineering">Software Engineering</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Status</label>
                        <select onchange="filterAssignmentsByStatus(this.value)">
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="graded">Graded</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div id="assignmentsList" class="assignments-grid">
                ${renderAssignmentCards(assignments, userSubmissions)}
            </div>
        </div>
        
        <div class="content-section">
            <h2><i class="fas fa-question-circle" aria-hidden="true"></i>MCQ Assignments</h2>
            <div class="table-container">
                <table class="table" role="table" aria-label="MCQ Assignments">
                    <thead>
                        <tr>
                            <th scope="col">Title</th>
                            <th scope="col">Subject</th>
                            <th scope="col">Due Date</th>
                            <th scope="col">Points</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mcqAssignments.map(mcq => `
                            <tr>
                                <td>${mcq.title}</td>
                                <td>${mcq.subject}</td>
                                <td>${formatDate(mcq.dueDate)}</td>
                                <td>${mcq.totalPoints}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="startMCQQuiz('${mcq.id}')" aria-label="Start MCQ quiz ${mcq.title}">Start Quiz</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderStaffAssignments() {
    const submissionCounts = assignments.map(assignment => {
        const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
        return {
            ...assignment,
            submissionCount: assignmentSubmissions.length,
            gradedCount: assignmentSubmissions.filter(s => s.grade !== undefined).length
        };
    });

    return `
        <div class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-book-open" aria-hidden="true"></i>Manage Assignments</h2>
                <button class="btn btn-primary" onclick="openCreateAssignmentModal()" aria-label="Create new assignment">
                    <i class="fas fa-plus" aria-hidden="true"></i>Create Assignment
                </button>
            </div>
            
            <div class="assignment-filters">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search assignments..." onkeyup="filterStaffAssignments(this.value)">
                </div>
                <div class="filter-group">
                    <label>Subject</label>
                    <select onchange="filterStaffAssignmentsBySubject(this.value)">
                        <option value="">All Subjects</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Programming">Programming</option>
                        <option value="Database Systems">Database Systems</option>
                        <option value="Software Engineering">Software Engineering</option>
                    </select>
                </div>
            </div>
            
            <div id="staffAssignmentsList" class="assignments-grid">
                ${renderStaffAssignmentCards(submissionCounts)}
            </div>
        </div>
    `;
}

function renderApplications() {
    if (currentUser.role === 'student') {
        return renderStudentApplications();
    } else {
        return renderStaffApplications();
    }
}

function renderStudentApplications() {
    const userApplications = applications.filter(a => a.submittedBy === currentUser.id);
    
    return `
        <div class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-file-text" aria-hidden="true"></i>My Applications</h2>
                <button class="btn btn-primary" onclick="showCreateApplicationForm()" aria-label="Submit new application">
                    <i class="fas fa-plus" aria-hidden="true"></i>Submit Application
                </button>
            </div>
            <div class="table-container">
                <table class="table applications-table" role="table" aria-label="Student Applications">
                    <thead>
                        <tr>
                            <th scope="col">Type</th>
                            <th scope="col">Title</th>
                            <th scope="col">Submitted Date</th>
                            <th scope="col">Status</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${userApplications.map(app => `
                            <tr>
                                <td>${app.type.charAt(0).toUpperCase() + app.type.slice(1)}</td>
                                <td>${app.title}</td>
                                <td>${formatDate(app.submittedAt)}</td>
                                <td><span class="status-badge status-${app.status}" aria-label="Status: ${app.status}">${app.status}</span></td>
                                <td>
                                    <button class="btn btn-secondary" onclick="viewApplication('${app.id}')" aria-label="View application ${app.title}">View</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderStaffApplications() {
    return `
        <div class="content-section">
            <div class="section-header">
                <h2><i class="fas fa-file-text" aria-hidden="true"></i>Review Applications</h2>
                <div class="filter-controls">
                    <select id="applicationTypeFilter" class="form-input" onchange="filterApplications()">
                        <option value="">All Types</option>
                        <option value="leave">Leave Request</option>
                        <option value="internship">Internship</option>
                        <option value="scholarship">Scholarship</option>
                        <option value="other">Other</option>
                    </select>
                    <select id="applicationStatusFilter" class="form-input" onchange="filterApplications()">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>
            <div class="table-container">
                <table class="table applications-table" role="table" aria-label="Staff Applications Review">
                    <thead>
                        <tr>
                            <th scope="col">Type</th>
                            <th scope="col">Title</th>
                            <th scope="col">Submitted By</th>
                            <th scope="col">Submitted Date</th>
                            <th scope="col">Status</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="applicationsTableBody">
                        ${applications.map(app => `
                            <tr data-type="${app.type}" data-status="${app.status}">
                                <td>${app.type.charAt(0).toUpperCase() + app.type.slice(1)}</td>
                                <td>${app.title}</td>
                                <td>${getUserName(app.submittedBy)}</td>
                                <td>${formatDate(app.submittedAt)}</td>
                                <td><span class="status-badge status-${app.status}" aria-label="Status: ${app.status}">${app.status}</span></td>
                                <td>
                                    <button class="btn btn-secondary" onclick="viewApplication('${app.id}')" aria-label="View application ${app.title}">View</button>
                                    ${app.status === 'pending' ? `
                                        <button class="btn btn-primary" onclick="approveApplication('${app.id}')" aria-label="Approve application ${app.title}">Approve</button>
                                        <button class="btn btn-danger" onclick="rejectApplication('${app.id}')" aria-label="Reject application ${app.title}">Reject</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAnnouncements() {
    // Filter announcements based on user role and target audience
    let filteredAnnouncements = announcements.filter(announcement => {
        if (announcement.targetAudience === 'all') return true;
        if (announcement.targetAudience === currentUser.role) return true;
        return false;
    });

    return `
        <div class="content-section">
            <div class="content-header">
                <h2><i class="fas fa-bullhorn" aria-hidden="true"></i>Announcements</h2>
                ${currentUser.role === 'staff' ? `
                    <button class="btn btn-primary" onclick="showCreateAnnouncementForm()" aria-label="Create new announcement">
                        <i class="fas fa-plus" aria-hidden="true"></i>New Announcement
                    </button>
                ` : ''}
            </div>
            ${currentUser.role === 'staff' ? renderStaffAnnouncements(filteredAnnouncements) : renderStudentAnnouncements(filteredAnnouncements)}
        </div>
    `;
}

function renderStaffAnnouncements(announcementsList) {
    if (announcementsList.length === 0) {
        return '<p class="no-data">No announcements available.</p>';
    }
    
    return `
        <div class="announcements-table-container">
            <table class="announcements-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Target</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${announcementsList.map(announcement => `
                        <tr>
                            <td>
                                <div class="announcement-title-cell">
                                    <strong>${announcement.title}</strong>
                                    <p class="announcement-preview">${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''}</p>
                                </div>
                            </td>
                            <td><span class="type-badge type-${announcement.type}">${announcement.type}</span></td>
                            <td><span class="status-badge status-${announcement.priority}">${announcement.priority}</span></td>
                            <td>${announcement.targetAudience}</td>
                            <td>${formatDate(announcement.createdAt)}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-secondary" onclick="viewAnnouncement('${announcement.id}')" aria-label="View announcement">
                                        <i class="fas fa-eye" aria-hidden="true"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="editAnnouncement('${announcement.id}')" aria-label="Edit announcement">
                                        <i class="fas fa-edit" aria-hidden="true"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${announcement.id}')" aria-label="Delete announcement">
                                        <i class="fas fa-trash" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderStudentAnnouncements(announcementsList) {
    if (announcementsList.length === 0) {
        return '<p class="no-data">No announcements available.</p>';
    }
    
    // Sort announcements by date (newest first) and highlight recent ones
    const sortedAnnouncements = announcementsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    return `
        <div class="announcements-grid">
            ${sortedAnnouncements.map(announcement => {
                const isRecent = new Date(announcement.createdAt) > sevenDaysAgo;
                return `
                    <div class="announcement-card ${isRecent ? 'recent' : ''}" role="article" aria-labelledby="announcement-${announcement.id}">
                        ${isRecent ? '<div class="recent-badge">New</div>' : ''}
                        <div class="announcement-header">
                            <h3 id="announcement-${announcement.id}" class="announcement-title">${announcement.title}</h3>
                            <div class="announcement-badges">
                                <span class="type-badge type-${announcement.type}">${announcement.type}</span>
                                <span class="status-badge status-${announcement.priority}">${announcement.priority}</span>
                            </div>
                        </div>
                        <div class="announcement-content">
                            <p class="announcement-message">${announcement.content}</p>
                            ${announcement.attachment ? `
                                <div class="attachment-info">
                                    <i class="fas fa-paperclip" aria-hidden="true"></i>
                                    <span>${announcement.attachment.name}</span>
                                </div>
                            ` : ''}
                            ${announcement.link ? `
                                <div class="link-info">
                                    <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                                    <a href="${announcement.link}" target="_blank" rel="noopener noreferrer">External Link</a>
                                </div>
                            ` : ''}
                        </div>
                        <div class="announcement-footer">
                            <span class="announcement-date" aria-label="Published on ${formatDate(announcement.createdAt)}">
                                <i class="fas fa-calendar" aria-hidden="true"></i>
                                ${formatDate(announcement.createdAt)}
                            </span>
                            <button class="btn btn-sm btn-secondary" onclick="viewAnnouncement('${announcement.id}')" aria-label="View full announcement">
                                View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ===== SCHEDULE RENDERING FUNCTIONS =====
function renderSchedule() {
    if (currentUser.role === 'staff') {
        return renderStaffSchedule();
    } else {
        return renderStudentSchedule();
    }
}

function renderStaffSchedule() {
    // Sort schedules by date and time
    const sortedSchedules = [...scheduleEvents].sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });

    return `
        <div class="content-section">
            <div class="content-header">
                <h2><i class="fas fa-calendar" aria-hidden="true"></i>Schedule Management</h2>
                <button class="btn btn-primary" onclick="showCreateScheduleForm()" aria-label="Create new schedule event">
                    <i class="fas fa-plus" aria-hidden="true"></i>New Event
                </button>
            </div>
            
            <div class="schedule-controls">
                <div class="view-toggle">
                    <button class="btn btn-sm ${currentScheduleView === 'list' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="switchScheduleView('list')" aria-label="Switch to list view">
                        <i class="fas fa-list" aria-hidden="true"></i> List View
                    </button>
                    <button class="btn btn-sm ${currentScheduleView === 'calendar' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="switchScheduleView('calendar')" aria-label="Switch to calendar view">
                        <i class="fas fa-calendar-alt" aria-hidden="true"></i> Calendar View
                    </button>
                </div>
            </div>
            
            ${currentScheduleView === 'list' ? renderScheduleListView(sortedSchedules) : renderScheduleCalendarView(sortedSchedules)}
        </div>
    `;
}

function renderStudentSchedule() {
    // Sort schedules by date and time
    const sortedSchedules = [...scheduleEvents].sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });

    // Filter upcoming schedules
    const now = new Date();
    const upcomingSchedules = sortedSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date + 'T' + schedule.time);
        return scheduleDate >= now;
    });

    // Get today's and this week's schedules
    const today = new Date().toDateString();
    const weekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const todaysSchedules = upcomingSchedules.filter(schedule => 
        new Date(schedule.date).toDateString() === today
    );
    
    const thisWeeksSchedules = upcomingSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date + 'T' + schedule.time);
        return scheduleDate <= weekFromNow;
    });

    return `
        <div class="content-section">
            <h2><i class="fas fa-calendar" aria-hidden="true"></i>My Schedule</h2>
            
            ${todaysSchedules.length > 0 ? `
                <div class="schedule-section">
                    <h3><i class="fas fa-star" aria-hidden="true"></i>Today's Events</h3>
                    <div class="schedule-timeline">
                        ${todaysSchedules.map(schedule => renderScheduleTimelineItem(schedule, 'today')).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${thisWeeksSchedules.length > 0 ? `
                <div class="schedule-section">
                    <h3><i class="fas fa-calendar-week" aria-hidden="true"></i>This Week</h3>
                    <div class="schedule-timeline">
                        ${thisWeeksSchedules.map(schedule => renderScheduleTimelineItem(schedule, 'week')).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="schedule-section">
                <h3><i class="fas fa-calendar-alt" aria-hidden="true"></i>All Upcoming Events</h3>
                ${upcomingSchedules.length > 0 ? `
                    <div class="schedule-grid">
                        ${upcomingSchedules.map(schedule => renderScheduleCard(schedule)).join('')}
                    </div>
                ` : '<p class="no-data">No upcoming events scheduled.</p>'}
            </div>
        </div>
    `;
}

function renderScheduleListView(schedules) {
    if (schedules.length === 0) {
        return '<p class="no-data">No schedule events available.</p>';
    }
    
    return `
        <div class="schedule-table-container">
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Date & Time</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedules.map(schedule => `
                        <tr>
                            <td>
                                <div class="schedule-title-cell">
                                    <strong>${schedule.title}</strong>
                                    ${schedule.description ? `<p class="schedule-description">${schedule.description}</p>` : ''}
                                </div>
                            </td>
                            <td><span class="category-badge category-${schedule.category}">${schedule.category}</span></td>
                            <td>
                                <div class="schedule-datetime">
                                    <div class="schedule-date">${formatDate(schedule.date)}</div>
                                    <div class="schedule-time">${formatTime(schedule.time)}</div>
                                </div>
                            </td>
                            <td>${schedule.location || '-'}</td>
                            <td><span class="priority-badge priority-${schedule.priority}">${schedule.priority}</span></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-secondary" onclick="viewSchedule('${schedule.id}')" aria-label="View schedule">
                                        <i class="fas fa-eye" aria-hidden="true"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="editSchedule('${schedule.id}')" aria-label="Edit schedule">
                                        <i class="fas fa-edit" aria-hidden="true"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule.id}')" aria-label="Delete schedule">
                                        <i class="fas fa-trash" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderScheduleCalendarView(schedules) {
    if (schedules.length === 0) {
        return '<p class="no-data">No schedule events available.</p>';
    }
    
    // Group schedules by date
    const schedulesByDate = {};
    schedules.forEach(schedule => {
        if (!schedulesByDate[schedule.date]) {
            schedulesByDate[schedule.date] = [];
        }
        schedulesByDate[schedule.date].push(schedule);
    });
    
    // Get current month dates
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendarDays = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        calendarDays.push(date);
    }
    
    return `
        <div class="schedule-calendar">
            <div class="calendar-header">
                <h3>${new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>
                <div class="calendar-days">
                    ${calendarDays.map(date => {
                        const dateString = date.toISOString().split('T')[0];
                        const daySchedules = schedulesByDate[dateString] || [];
                        const isCurrentMonth = date.getMonth() === currentMonth;
                        const isToday = date.toDateString() === now.toDateString();
                        
                        return `
                            <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}">
                                <div class="day-number">${date.getDate()}</div>
                                ${daySchedules.map(schedule => `
                                    <div class="calendar-event category-${schedule.category}" 
                                         onclick="viewSchedule('${schedule.id}')" 
                                         title="${schedule.title}">
                                        ${schedule.title}
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderScheduleTimelineItem(schedule, type) {
    const scheduleDate = new Date(schedule.date + 'T' + schedule.time);
    const isToday = type === 'today';
    
    return `
        <div class="timeline-item ${isToday ? 'today' : ''}">
            <div class="timeline-marker category-${schedule.category}"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h4>${schedule.title}</h4>
                    <span class="timeline-time">${formatTime(schedule.time)}</span>
                </div>
                ${schedule.description ? `<p class="timeline-description">${schedule.description}</p>` : ''}
                ${schedule.location ? `<div class="timeline-location"><i class="fas fa-map-marker-alt"></i> ${schedule.location}</div>` : ''}
                <div class="timeline-category">
                    <span class="category-badge category-${schedule.category}">${schedule.category}</span>
                </div>
            </div>
        </div>
    `;
}

function renderScheduleCard(schedule) {
    const scheduleDate = new Date(schedule.date + 'T' + schedule.time);
    const now = new Date();
    const isToday = scheduleDate.toDateString() === now.toDateString();
    const isUpcoming = scheduleDate > now;
    
    return `
        <div class="schedule-card ${isToday ? 'today' : ''} ${isUpcoming ? 'upcoming' : 'past'}" 
             onclick="viewSchedule('${schedule.id}')">
            <div class="schedule-card-header">
                <h4>${schedule.title}</h4>
                <span class="category-badge category-${schedule.category}">${schedule.category}</span>
            </div>
            <div class="schedule-card-content">
                ${schedule.description ? `<p class="schedule-description">${schedule.description}</p>` : ''}
                <div class="schedule-meta">
                    <div class="schedule-datetime">
                        <i class="fas fa-calendar" aria-hidden="true"></i>
                        <span>${formatDate(schedule.date)}</span>
                    </div>
                    <div class="schedule-time">
                        <i class="fas fa-clock" aria-hidden="true"></i>
                        <span>${formatTime(schedule.time)}</span>
                    </div>
                    ${schedule.location ? `
                        <div class="schedule-location">
                            <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                            <span>${schedule.location}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderProfile() {
    return `
        <div class="content-section">
            <h2><i class="fas fa-user" aria-hidden="true"></i>Profile</h2>
            <div class="profile-info">
                <div class="profile-field">
                    <label class="profile-label">Name:</label>
                    <span class="profile-value">${currentUser.name}</span>
                </div>
                <div class="profile-field">
                    <label class="profile-label">Email:</label>
                    <span class="profile-value">${currentUser.email}</span>
                </div>
                <div class="profile-field">
                    <label class="profile-label">Role:</label>
                    <span class="profile-value">${currentUser.role}</span>
                </div>
                ${currentUser.phone ? `
                    <div class="profile-field">
                        <label class="profile-label">Phone:</label>
                        <span class="profile-value">${currentUser.phone}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderSettings() {
    return `
        <div class="content-section">
            <h2><i class="fas fa-cog" aria-hidden="true"></i>Settings</h2>
            <div class="form-container">
                <div class="form-group">
                    <label for="darkModeToggle" class="form-label">Dark Mode</label>
                    <input 
                        type="checkbox" 
                        id="darkModeToggle" 
                        ${isDarkMode ? 'checked' : ''} 
                        onchange="toggleDarkMode()"
                        aria-describedby="darkModeHelp"
                    >
                    <p id="darkModeHelp" class="form-hint">Toggle between light and dark themes</p>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="saveSettings()" aria-label="Save settings">Save Settings</button>
                </div>
            </div>
        </div>
    `;
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getUserName(userId) {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
}

// ===== ANNOUNCEMENT MANAGEMENT FUNCTIONS =====
function showCreateAnnouncementForm() {
    // Reset form
    document.getElementById('announcementForm').reset();
    
    // Show modal
    document.getElementById('announcementModal').classList.remove('hidden');
    
    // Focus first input for accessibility
    document.getElementById('announcementTitle').focus();
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').classList.add('hidden');
}

async function submitAnnouncement() {
    // Check if user has staff role and is properly authenticated
    if (!requireCurrentUser('staff', 'create announcements')) {
        return;
    }

    const form = document.getElementById('announcementForm');
    const formData = new FormData(form);

    // Validate required fields
    const title = formData.get('title');
    const message = formData.get('message');

    if (!title || !message) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }

    // Create new announcement object
    const createdBy = getCreatedByObject();
    const newAnnouncement = {
        title: title,
        content: message,
        type: formData.get('type') || 'general',
        priority: formData.get('priority') || 'medium',
        targetAudience: formData.get('targetAudience') || 'all',
        isPublished: true,
        publishDate: new Date().toISOString(),
        createdBy: createdBy,
        readBy: []
    };

    // Handle file attachment if present
    const fileInput = document.getElementById('announcementAttachment');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        newAnnouncement.attachment = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };
        console.log('File attached:', file.name);
    }

    // Handle external link if present
    const link = formData.get('link');
    if (link && link.trim()) {
        newAnnouncement.link = link.trim();
    }

    try {
        // Try to save to Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const announcementData = {
                title: title,
                content: message,
                type: formData.get('type') || 'general',
                priority: formData.get('priority') || 'medium',
                targetAudience: formData.get('targetAudience') || 'all'
            };
            
            // Handle file attachment if present
            const fileInput = document.getElementById('announcementAttachment');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                announcementData.attachment = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                };
                console.log('File attached:', file.name);
            }

            // Handle external link if present
            const link = formData.get('link');
            if (link && link.trim()) {
                announcementData.link = link.trim();
            }
            
            const result = await createAnnouncementWithFirebase(announcementData);
            if (result.success) {
                // Add notification for staff about new announcement
                if (currentUser.role === 'staff') {
                    addNotification('New Announcement Created', `Announcement "${title}" has been created successfully and saved to Firebase.`, 'success');
                }

                // Close modal and show success message
                closeAnnouncementModal();
                showConfirmation('Announcement Created', `Your announcement "${title}" has been created successfully and saved to Firebase!`, 'success');

                // Refresh the announcements view
                showView('announcements');
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        const newAnnouncement = {
            id: 'ann_' + Date.now(),
            title: title,
            content: message,
            type: formData.get('type') || 'general',
            priority: formData.get('priority') || 'medium',
            createdBy: createdBy,
            createdAt: new Date().toISOString(),
            targetAudience: formData.get('targetAudience') || 'all',
            isPublished: true,
            publishDate: new Date().toISOString(),
            readBy: []
        };

        // Handle file attachment if present
        const fileInput = document.getElementById('announcementAttachment');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            newAnnouncement.attachment = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            };
            console.log('File attached:', file.name);
        }

        // Handle external link if present
        const link = formData.get('link');
        if (link && link.trim()) {
            newAnnouncement.link = link.trim();
        }
        
        announcements.push(newAnnouncement);
        localStorage.setItem('announcements', JSON.stringify(announcements));
        
        // Add notification for staff about new announcement
        if (currentUser.role === 'staff') {
            addNotification('New Announcement Created', `Announcement "${title}" has been created successfully.`, 'success');
        }

        // Close modal and show success message
        closeAnnouncementModal();
        showConfirmation('Announcement Created', `Your announcement "${title}" has been created successfully.`, 'success');

        // Refresh the announcements view
        showView('announcements');
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        showConfirmation('Error', `Failed to create announcement: ${error.message}`, 'error');
    }
}

function viewAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) {
        showConfirmation('Error', 'Announcement not found.', 'error');
        return;
    }

    const modalContent = document.getElementById('viewAnnouncementContent');
    modalContent.innerHTML = `
        <div class="announcement-details">
            <div class="announcement-header">
                <h4>${announcement.title}</h4>
                <div class="announcement-badges">
                    <span class="type-badge type-${announcement.type}">${announcement.type}</span>
                    <span class="status-badge status-${announcement.priority}">${announcement.priority}</span>
                </div>
            </div>
            
            <div class="announcement-meta">
                <div class="meta-item">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span>Created by: ${getUserName(announcement.createdBy)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar" aria-hidden="true"></i>
                    <span>Published: ${formatDate(announcement.createdAt)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users" aria-hidden="true"></i>
                    <span>Target: ${announcement.targetAudience}</span>
                </div>
            </div>
            
            <div class="announcement-content">
                <div class="description-text">
                    <p>${announcement.content}</p>
                </div>
                
                ${announcement.attachment ? `
                    <div class="attachment-info">
                        <h5>Attachment</h5>
                        <div class="file-info">
                            <i class="fas fa-paperclip" aria-hidden="true"></i>
                            <span>${announcement.attachment.name}</span>
                            <span class="file-size">(${formatFileSize(announcement.attachment.size)})</span>
                        </div>
                    </div>
                ` : ''}
                
                ${announcement.link ? `
                    <div class="link-info">
                        <h5>External Link</h5>
                        <a href="${announcement.link}" target="_blank" rel="noopener noreferrer" class="external-link">
                            <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                            ${announcement.link}
                        </a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Show modal
    document.getElementById('viewAnnouncementModal').classList.remove('hidden');
}

function closeViewAnnouncementModal() {
    document.getElementById('viewAnnouncementModal').classList.add('hidden');
}

function editAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) {
        showConfirmation('Error', 'Announcement not found.', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editAnnouncementId').value = announcementId;
    document.getElementById('editAnnouncementTitle').value = announcement.title;
    document.getElementById('editAnnouncementMessage').value = announcement.content;
    document.getElementById('editAnnouncementType').value = announcement.type;
    document.getElementById('editAnnouncementPriority').value = announcement.priority;
    document.getElementById('editAnnouncementTarget').value = announcement.targetAudience;
    if (announcement.link) {
        document.getElementById('editAnnouncementLink').value = announcement.link;
    }

    // Show modal
    document.getElementById('editAnnouncementModal').classList.remove('hidden');
    
    // Focus first input for accessibility
    document.getElementById('editAnnouncementTitle').focus();
}

function closeEditAnnouncementModal() {
    document.getElementById('editAnnouncementModal').classList.add('hidden');
}

function updateAnnouncement() {
    const form = document.getElementById('editAnnouncementForm');
    const formData = new FormData(form);

    // Validate required fields
    const title = formData.get('title');
    const message = formData.get('message');
    const announcementId = formData.get('announcementId');

    if (!title || !message) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }

    // Find and update announcement
    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
        showConfirmation('Error', 'Announcement not found.', 'error');
        return;
    }

    const updatedAnnouncement = {
        ...announcements[announcementIndex],
        title: title,
        content: message,
        type: formData.get('type') || 'general',
        priority: formData.get('priority') || 'medium',
        targetAudience: formData.get('targetAudience') || 'all',
        updatedAt: new Date().toISOString()
    };

    // Handle file attachment if present
    const fileInput = document.getElementById('editAnnouncementAttachment');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        updatedAnnouncement.attachment = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };
    }

    // Handle external link if present
    const link = formData.get('link');
    if (link && link.trim()) {
        updatedAnnouncement.link = link.trim();
    } else {
        delete updatedAnnouncement.link;
    }

    // Update announcement
    announcements[announcementIndex] = updatedAnnouncement;

    // Save to localStorage
    localStorage.setItem('announcements', JSON.stringify(announcements));

    // Add notification
    addNotification('Announcement Updated', `Announcement "${title}" has been updated successfully.`, 'success');

    // Close modal and show success message
    closeEditAnnouncementModal();
    showConfirmation('Announcement Updated', `Announcement "${title}" has been updated successfully.`, 'success');

    // Refresh the announcements view
    showView('announcements');
}

function deleteAnnouncement(announcementId) {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) {
        showConfirmation('Error', 'Announcement not found.', 'error');
        return;
    }

    // Set announcement ID for deletion
    document.getElementById('deleteAnnouncementId').value = announcementId;
    
    // Show confirmation modal
    document.getElementById('deleteAnnouncementModal').classList.remove('hidden');
}

function closeDeleteAnnouncementModal() {
    document.getElementById('deleteAnnouncementModal').classList.add('hidden');
}

function confirmDeleteAnnouncement() {
    const announcementId = document.getElementById('deleteAnnouncementId').value;
    
    // Find and remove announcement
    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
        showConfirmation('Error', 'Announcement not found.', 'error');
        return;
    }

    const deletedAnnouncement = announcements[announcementIndex];
    
    // Remove announcement
    announcements.splice(announcementIndex, 1);

    // Save to localStorage
    localStorage.setItem('announcements', JSON.stringify(announcements));

    // Add notification
    addNotification('Announcement Deleted', `Announcement "${deletedAnnouncement.title}" has been deleted.`, 'info');

    // Close modal and show success message
    closeDeleteAnnouncementModal();
    showConfirmation('Announcement Deleted', `Announcement "${deletedAnnouncement.title}" has been deleted successfully.`, 'success');

    // Refresh the announcements view
    showView('announcements');
}

// ===== SCHEDULE MANAGEMENT FUNCTIONS =====
let currentScheduleView = 'list';

function showCreateScheduleForm() {
    // Reset form
    document.getElementById('scheduleForm').reset();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scheduleDate').value = today;
    
    // Set default time to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const timeString = now.toTimeString().slice(0, 5);
    document.getElementById('scheduleTime').value = timeString;
    
    // Show modal
    document.getElementById('scheduleModal').classList.remove('hidden');
    
    // Focus first input for accessibility
    document.getElementById('scheduleTitle').focus();
}

function closeScheduleModal() {
    document.getElementById('scheduleModal').classList.add('hidden');
}

async function submitSchedule() {
    // Check if user has staff role and is properly authenticated
    if (!requireCurrentUser('staff', 'create schedule events')) {
        return;
    }

    const form = document.getElementById('scheduleForm');
    const formData = new FormData(form);

    // Validate required fields
    const title = formData.get('title');
    const date = formData.get('date');
    const time = formData.get('time');
    const category = formData.get('category');

    if (!title || !date || !time || !category) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }

    // Create new schedule object
    const createdBy = getCreatedByObject();
    const newSchedule = {
        title: title,
        description: formData.get('description') || '',
        date: date,
        time: time,
        category: category,
        location: formData.get('location') || '',
        priority: formData.get('priority') || 'medium',
        createdBy: createdBy
    };

    try {
        // Try to save to Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const scheduleData = {
                title: title,
                description: formData.get('description') || '',
                date: date,
                time: time,
                category: category,
                location: formData.get('location') || '',
                priority: formData.get('priority') || 'medium'
            };
            
            const result = await createScheduleWithFirebase(scheduleData);
            if (result.success) {
                // Add notification for staff about new schedule
                if (currentUser.role === 'staff') {
                    addNotification('New Schedule Event Created', `Schedule event "${title}" has been created successfully and saved to Firebase.`, 'success');
                }

                // Close modal and show success message
                closeScheduleModal();
                showConfirmation('Schedule Event Created', `Your schedule event "${title}" has been created successfully and saved to Firebase!`, 'success');

                // Refresh the schedule view
                showView('schedule');
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        const newSchedule = {
            id: 'schedule_' + Date.now(),
            title: title,
            description: formData.get('description') || '',
            date: date,
            time: time,
            category: category,
            location: formData.get('location') || '',
            priority: formData.get('priority') || 'medium',
            createdBy: createdBy,
            createdAt: new Date().toISOString()
        };
        
        scheduleEvents.push(newSchedule);
        localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents));
        
        // Add notification for staff about new schedule
        if (currentUser.role === 'staff') {
            addNotification('New Schedule Event Created', `Schedule event "${title}" has been created successfully.`, 'success');
        }

        // Close modal and show success message
        closeScheduleModal();
        showConfirmation('Schedule Event Created', `Your schedule event "${title}" has been created successfully.`, 'success');

        // Refresh the schedule view
        showView('schedule');
        
    } catch (error) {
        console.error('Error creating schedule:', error);
        showConfirmation('Error', `Failed to create schedule event: ${error.message}`, 'error');
    }
}

function viewSchedule(scheduleId) {
    const schedule = scheduleEvents.find(s => s.id === scheduleId);
    if (!schedule) {
        showConfirmation('Error', 'Schedule event not found.', 'error');
        return;
    }

    const modalContent = document.getElementById('viewScheduleContent');
    modalContent.innerHTML = `
        <div class="schedule-details">
            <div class="schedule-header">
                <h4>${schedule.title}</h4>
                <div class="schedule-badges">
                    <span class="category-badge category-${schedule.category}">${schedule.category}</span>
                    <span class="priority-badge priority-${schedule.priority}">${schedule.priority}</span>
                </div>
            </div>
            
            <div class="schedule-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar" aria-hidden="true"></i>
                    <span>Date: ${formatDate(schedule.date)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    <span>Time: ${formatTime(schedule.time)}</span>
                </div>
                ${schedule.location ? `
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        <span>Location: ${schedule.location}</span>
                    </div>
                ` : ''}
                <div class="meta-item">
                    <i class="fas fa-user" aria-hidden="true"></i>
                    <span>Created by: ${getUserName(schedule.createdBy)}</span>
                </div>
            </div>
            
            ${schedule.description ? `
                <div class="schedule-content">
                    <h5>Description</h5>
                    <p>${schedule.description}</p>
                </div>
            ` : ''}
        </div>
    `;

    // Show modal
    document.getElementById('viewScheduleModal').classList.remove('hidden');
}

function closeViewScheduleModal() {
    document.getElementById('viewScheduleModal').classList.add('hidden');
}

function editSchedule(scheduleId) {
    const schedule = scheduleEvents.find(s => s.id === scheduleId);
    if (!schedule) {
        showConfirmation('Error', 'Schedule event not found.', 'error');
        return;
    }

    // Populate form fields
    document.getElementById('editScheduleId').value = scheduleId;
    document.getElementById('editScheduleTitle').value = schedule.title;
    document.getElementById('editScheduleDescription').value = schedule.description;
    document.getElementById('editScheduleDate').value = schedule.date;
    document.getElementById('editScheduleTime').value = schedule.time;
    document.getElementById('editScheduleCategory').value = schedule.category;
    document.getElementById('editScheduleLocation').value = schedule.location;
    document.getElementById('editSchedulePriority').value = schedule.priority;

    // Show modal
    document.getElementById('editScheduleModal').classList.remove('hidden');
    
    // Focus first input for accessibility
    document.getElementById('editScheduleTitle').focus();
}

function closeEditScheduleModal() {
    document.getElementById('editScheduleModal').classList.add('hidden');
}

function updateSchedule() {
    const form = document.getElementById('editScheduleForm');
    const formData = new FormData(form);

    // Validate required fields
    const title = formData.get('title');
    const date = formData.get('date');
    const time = formData.get('time');
    const category = formData.get('category');
    const scheduleId = formData.get('scheduleId');

    if (!title || !date || !time || !category) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }

    // Find and update schedule
    const scheduleIndex = scheduleEvents.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) {
        showConfirmation('Error', 'Schedule event not found.', 'error');
        return;
    }

    const updatedSchedule = {
        ...scheduleEvents[scheduleIndex],
        title: title,
        description: formData.get('description') || '',
        date: date,
        time: time,
        category: category,
        location: formData.get('location') || '',
        priority: formData.get('priority') || 'medium',
        updatedAt: new Date().toISOString()
    };

    // Update schedule
    scheduleEvents[scheduleIndex] = updatedSchedule;

    // Save to localStorage
    localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents));

    // Add notification
    addNotification('Schedule Event Updated', `Schedule event "${title}" has been updated successfully.`, 'success');

    // Close modal and show success message
    closeEditScheduleModal();
    showConfirmation('Schedule Event Updated', `Schedule event "${title}" has been updated successfully.`, 'success');

    // Refresh the schedule view
    showView('schedule');
}

function deleteSchedule(scheduleId) {
    const schedule = scheduleEvents.find(s => s.id === scheduleId);
    if (!schedule) {
        showConfirmation('Error', 'Schedule event not found.', 'error');
        return;
    }

    // Set schedule ID for deletion
    document.getElementById('deleteScheduleId').value = scheduleId;
    
    // Show confirmation modal
    document.getElementById('deleteScheduleModal').classList.remove('hidden');
}

function closeDeleteScheduleModal() {
    document.getElementById('deleteScheduleModal').classList.add('hidden');
}

function confirmDeleteSchedule() {
    const scheduleId = document.getElementById('deleteScheduleId').value;
    
    // Find and remove schedule
    const scheduleIndex = scheduleEvents.findIndex(s => s.id === scheduleId);
    if (scheduleIndex === -1) {
        showConfirmation('Error', 'Schedule event not found.', 'error');
        return;
    }
    
    const deletedSchedule = scheduleEvents[scheduleIndex];
    
    // Remove schedule
    scheduleEvents.splice(scheduleIndex, 1);

    // Save to localStorage
    localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents));

    // Add notification
    addNotification('Schedule Event Deleted', `Schedule event "${deletedSchedule.title}" has been deleted.`, 'info');

    // Close modal and show success message
    closeDeleteScheduleModal();
    showConfirmation('Schedule Event Deleted', `Schedule event "${deletedSchedule.title}" has been deleted successfully.`, 'success');

    // Refresh the schedule view
    showView('schedule');
}

function switchScheduleView(view) {
    currentScheduleView = view;
    showView('schedule');
}

// ===== MODAL MANAGEMENT =====
function showConfirmation(title, message, type = 'success') {
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    modal.classList.remove('hidden');
    
    // Focus the modal for accessibility
    modal.focus();
    
    // Announce modal for screen readers
    if (window.announcePageChange) {
        window.announcePageChange(`${title}: ${message}`);
    }
}

function closeModal() {
    document.getElementById('confirmationModal').classList.add('hidden');
}

// ===== NOTIFICATION MANAGEMENT =====
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const btn = document.getElementById('notificationBtn');
    const isHidden = panel.classList.contains('hidden');
    
    if (isHidden) {
        panel.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        renderNotifications();
    } else {
        panel.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
    }
}

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">No notifications</p>';
        return;
    }
    
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" 
             onclick="markNotificationAsRead('${notification.id}')" 
             role="button" 
             tabindex="0"
             aria-label="${notification.title}: ${notification.message}">
            <h4>${notification.title}</h4>
            <p>${notification.message}</p>
            <div class="time" aria-label="Received on ${formatDate(notification.createdAt)}">${formatDate(notification.createdAt)}</div>
        </div>
    `).join('');
}

function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateUserInfo();
        renderNotifications();
    }
}

function clearAllNotifications() {
    notifications = [];
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateUserInfo();
    renderNotifications();
    
    // Announce for screen readers
    if (window.announcePageChange) {
        window.announcePageChange('All notifications cleared');
    }
}

function addNotification(title, message, type = 'info') {
    const notification = {
        id: 'notif_' + Date.now(),
        title: title,
        message: message,
        type: type,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    notifications.unshift(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateUserInfo();
    renderNotifications();
    
    return notification;
}

// ===== SETTINGS =====
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    
    // Announce for screen readers
    if (window.announcePageChange) {
        const mode = isDarkMode ? 'dark' : 'light';
        window.announcePageChange(`Switched to ${mode} mode`);
    }
}

async function logout() {
    try {
        // Show loading state
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            const originalText = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            logoutBtn.disabled = true;
            
            // Attempt Firebase logout
            if (firebaseAuth) {
                const result = await logoutUser();
                if (!result.success) {
                    console.warn('Firebase logout failed:', result.error);
                }
            }
            
            // Clear local state regardless of Firebase result
            currentUser = null;
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            
            showLoginPage();
            
            showAlert('You have been safely logged out of the system. Thank you for using AssignmentHub!', 'info');
            
            // Announce for screen readers
            if (window.announcePageChange) {
                window.announcePageChange('Successfully logged out');
            }
            
            // Reset button state
            logoutBtn.innerHTML = originalText;
            logoutBtn.disabled = false;
        }
    } catch (error) {
        console.error('Logout error:', error);
        
        // Force logout even if Firebase fails
        currentUser = null;
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        showLoginPage();
        
        showAlert('You have been logged out of the system.', 'info');
    }
}

// ===== ASSIGNMENT MODULE FUNCTIONS =====

// ===== ASSIGNMENT CARD RENDERING =====
function renderAssignmentCards(assignmentList, userSubmissions = []) {
    if (assignmentList.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No Assignments Found</h3>
                <p>There are no assignments available at the moment.</p>
            </div>
        `;
    }

    return assignmentList.map(assignment => {
        const submission = userSubmissions.find(s => s.assignmentId === assignment.id);
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now && !submission;
        const isDueSoon = dueDate > now && (dueDate - now) <= 24 * 60 * 60 * 1000; // 24 hours
        
        let statusInfo = {
            status: 'pending',
            statusClass: 'status-pending',
            statusText: 'Pending'
        };
        
        if (submission) {
            if (submission.grade !== undefined) {
                statusInfo = {
                    status: 'graded',
                    statusClass: 'status-graded',
                    statusText: 'Graded'
                };
            } else {
                statusInfo = {
                    status: 'submitted',
                    statusClass: 'status-submitted',
                    statusText: 'Submitted'
                };
            }
        } else if (isOverdue) {
            statusInfo = {
                status: 'overdue',
                statusClass: 'status-overdue',
                statusText: 'Overdue'
            };
        }

        return `
            <div class="assignment-card">
                <div class="assignment-card-header">
                    <div>
                        <h3 class="assignment-title">${assignment.title}</h3>
                        <span class="assignment-subject">${assignment.subject}</span>
                    </div>
                    <span class="status-badge ${statusInfo.statusClass}">${statusInfo.statusText}</span>
                </div>
                
                <p class="assignment-description">${assignment.description}</p>
                
                <div class="assignment-meta">
                    <div class="assignment-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="assignment-due-date ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}">
                            Due: ${formatDate(assignment.dueDate)} ${assignment.dueTime || ''}
                        </span>
                    </div>
                    <div class="assignment-meta-item">
                        <i class="fas fa-star"></i>
                        <span>Max Score: ${assignment.maxScore} points</span>
                    </div>
                    ${submission && submission.grade !== undefined ? `
                        <div class="assignment-meta-item">
                            <i class="fas fa-trophy"></i>
                            <span>Your Score: ${submission.grade}/${assignment.maxScore}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="assignment-actions">
                    ${!submission && !isOverdue ? 
                        `<button class="btn btn-primary" onclick="openSubmissionModal('${assignment.id}')">
                            <i class="fas fa-upload"></i> Submit Assignment
                        </button>` : 
                        submission ? 
                        `<button class="btn btn-secondary" onclick="viewSubmissionDetails('${submission.id}')">
                            <i class="fas fa-eye"></i> View Submission
                        </button>` :
                        `<button class="btn btn-secondary" disabled>
                            <i class="fas fa-exclamation-triangle"></i> Overdue
                        </button>`
                    }
                    <button class="btn btn-secondary" onclick="viewAssignmentDetails('${assignment.id}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderStaffAssignmentCards(assignmentList) {
    if (assignmentList.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>No Assignments Created</h3>
                <p>Create your first assignment to get started.</p>
                <button class="btn btn-primary" onclick="openCreateAssignmentModal()">
                    <i class="fas fa-plus"></i> Create Assignment
                </button>
            </div>
        `;
    }

    return assignmentList.map(assignment => {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const isOverdue = dueDate < now;
        const isDueSoon = dueDate > now && (dueDate - now) <= 24 * 60 * 60 * 1000;

        return `
            <div class="assignment-card">
                <div class="assignment-card-header">
                    <div>
                        <h3 class="assignment-title">${assignment.title}</h3>
                        <span class="assignment-subject">${assignment.subject}</span>
                    </div>
                </div>
                
                <p class="assignment-description">${assignment.description}</p>
                
                <div class="assignment-meta">
                    <div class="assignment-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="assignment-due-date ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}">
                            Due: ${formatDate(assignment.dueDate)} ${assignment.dueTime || ''}
                        </span>
                    </div>
                    <div class="assignment-meta-item">
                        <i class="fas fa-star"></i>
                        <span>Max Score: ${assignment.maxScore} points</span>
                    </div>
                    <div class="assignment-meta-item">
                        <i class="fas fa-users"></i>
                        <span>Submissions: ${assignment.submissionCount}</span>
                    </div>
                    <div class="assignment-meta-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Graded: ${assignment.gradedCount}/${assignment.submissionCount}</span>
                    </div>
                </div>
                
                <div class="assignment-progress">
                    <div class="progress-label">
                        <span>Grading Progress</span>
                        <span class="progress-percentage">
                            ${assignment.submissionCount > 0 ? Math.round((assignment.gradedCount / assignment.submissionCount) * 100) : 0}%
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${assignment.submissionCount > 0 ? (assignment.gradedCount / assignment.submissionCount) * 100 : 0}%"></div>
                    </div>
                </div>
                
                <div class="assignment-actions">
                    <button class="btn btn-primary" onclick="viewAssignmentSubmissions('${assignment.id}')">
                        <i class="fas fa-list"></i> View Submissions (${assignment.submissionCount})
                    </button>
                    <button class="btn btn-secondary" onclick="editAssignment('${assignment.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteAssignment('${assignment.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== ASSIGNMENT CREATION =====
function openCreateAssignmentModal() {
    document.getElementById('createAssignmentModal').classList.remove('hidden');
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('assignmentDueDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('assignmentDueTime').value = '23:59';
    
    // Focus on title field
    setTimeout(() => {
        document.getElementById('assignmentTitle').focus();
    }, 100);
}

function closeCreateAssignmentModal() {
    document.getElementById('createAssignmentModal').classList.add('hidden');
    document.getElementById('createAssignmentForm').reset();
}

async function saveAssignment() {
    // Check if user has staff role and is properly authenticated
    if (!requireCurrentUser('staff', 'create assignments')) {
        return;
    }

    const form = document.getElementById('createAssignmentForm');
    const formData = new FormData(form);
    
    // Validation
    if (!formData.get('title') || !formData.get('subject') || !formData.get('description') || 
        !formData.get('dueDate') || !formData.get('dueTime') || !formData.get('maxScore')) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }
    
    const assignmentData = {
        title: formData.get('title'),
        subject: formData.get('subject'),
        description: formData.get('description'),
        dueDate: formData.get('dueDate'),
        dueTime: formData.get('dueTime'),
        maxScore: parseInt(formData.get('maxScore'))
    };
    
    try {
        // Try to save to Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const result = await createAssignmentWithFirebase(assignmentData);
            if (result.success) {
                closeCreateAssignmentModal();
                showConfirmation('Assignment Created', `Assignment "${assignmentData.title}" has been created successfully and saved to Firebase!`, 'success');
                
                // Refresh the view if we're on assignments page
                if (currentView === 'assignments') {
                    showView('assignments');
                }
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        const createdBy = getCreatedByObject();
        const newAssignment = {
            id: 'assign_' + Date.now(),
            ...assignmentData,
            createdBy: createdBy,
            createdAt: new Date().toISOString(),
            attachment: null // File handling can be implemented later
        };
        
        assignments.push(newAssignment);
        localStorage.setItem('assignments', JSON.stringify(assignments));
        
        closeCreateAssignmentModal();
        showConfirmation('Assignment Created', `Assignment "${newAssignment.title}" has been created successfully!`, 'success');
        
        // Refresh the view if we're on assignments page
        if (currentView === 'assignments') {
            showView('assignments');
        }
        
    } catch (error) {
        console.error('Error saving assignment:', error);
        showConfirmation('Error', `Failed to create assignment: ${error.message}`, 'error');
    }
}

// ===== ASSIGNMENT EDITING =====
function editAssignment(assignmentId) {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    // Populate edit form
    document.getElementById('editAssignmentId').value = assignment.id;
    document.getElementById('editAssignmentTitleInput').value = assignment.title;
    document.getElementById('editAssignmentSubjectSelect').value = assignment.subject;
    document.getElementById('editAssignmentDescriptionText').value = assignment.description;
    document.getElementById('editAssignmentDueDateInput').value = assignment.dueDate;
    document.getElementById('editAssignmentDueTimeInput').value = assignment.dueTime || '';
    document.getElementById('editAssignmentMaxScoreInput').value = assignment.maxScore;
    
    document.getElementById('editAssignmentModal').classList.remove('hidden');
}

function closeEditAssignmentModal() {
    document.getElementById('editAssignmentModal').classList.add('hidden');
    document.getElementById('editAssignmentForm').reset();
}

function updateAssignment() {
    const form = document.getElementById('editAssignmentForm');
    const formData = new FormData(form);
    const assignmentId = formData.get('id');
    
    const assignmentIndex = assignments.findIndex(a => a.id === assignmentId);
    if (assignmentIndex === -1) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    // Validation
    if (!formData.get('title') || !formData.get('subject') || !formData.get('description') || 
        !formData.get('dueDate') || !formData.get('dueTime') || !formData.get('maxScore')) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }
    
    // Update assignment
    assignments[assignmentIndex] = {
        ...assignments[assignmentIndex],
        title: formData.get('title'),
        subject: formData.get('subject'),
        description: formData.get('description'),
        dueDate: formData.get('dueDate'),
        dueTime: formData.get('dueTime'),
        maxScore: parseInt(formData.get('maxScore')),
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('assignments', JSON.stringify(assignments));
    
    closeEditAssignmentModal();
    showConfirmation('Assignment Updated', 'Assignment has been updated successfully!', 'success');
    
    // Refresh the view
    if (currentView === 'assignments') {
        showView('assignments');
    }
}

function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
        return;
    }
    
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    // Remove assignment
    assignments = assignments.filter(a => a.id !== assignmentId);
    
    // Remove related submissions
    submissions = submissions.filter(s => s.assignmentId !== assignmentId);
    
    localStorage.setItem('assignments', JSON.stringify(assignments));
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    showConfirmation('Assignment Deleted', `Assignment "${assignment.title}" has been deleted.`, 'warning');
    
    // Refresh the view
    if (currentView === 'assignments') {
        showView('assignments');
    }
}

// ===== STUDENT SUBMISSION =====
function openSubmissionModal(assignmentId) {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    // Check if already submitted
    const existingSubmission = submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUser.id);
    if (existingSubmission) {
        showConfirmation('Already Submitted', 'You have already submitted this assignment.', 'info');
        return;
    }
    
    // Check if overdue
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    if (dueDate < now) {
        showConfirmation('Assignment Overdue', 'This assignment is past its due date.', 'warning');
        return;
    }
    
    // Populate assignment info
    document.getElementById('submissionAssignmentInfo').innerHTML = `
        <h4>${assignment.title}</h4>
        <p>${assignment.description}</p>
        <div class="meta-grid">
            <div class="meta-item">
                <i class="fas fa-book"></i>
                <span>Subject: ${assignment.subject}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar"></i>
                <span>Due: ${formatDate(assignment.dueDate)} ${assignment.dueTime || ''}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-star"></i>
                <span>Max Score: ${assignment.maxScore} points</span>
            </div>
        </div>
    `;
    
    document.getElementById('submissionAssignmentId').value = assignmentId;
    document.getElementById('submissionModal').classList.remove('hidden');
    
    // Focus on text area
    setTimeout(() => {
        document.getElementById('submissionText').focus();
    }, 100);
}

function closeSubmissionModal() {
    document.getElementById('submissionModal').classList.add('hidden');
    document.getElementById('submissionForm').reset();
}

async function submitAssignment() {
    // Check if user has student role
    if (!requireRole('student', 'submit assignments')) {
        return;
    }

    const form = document.getElementById('submissionForm');
    const formData = new FormData(form);
    const assignmentId = formData.get('assignmentId');
    const submissionText = formData.get('submissionText');
    
    if (!submissionText.trim()) {
        showConfirmation('Validation Error', 'Please enter your solution/answer.', 'error');
        return;
    }
    
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    const submissionData = {
        answerText: submissionText,
        fileUrl: null // File handling can be implemented later
    };
    
    try {
        // Try to submit to Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const result = await submitAssignmentWithFirebase(assignmentId, submissionData);
            if (result.success) {
                closeSubmissionModal();
                showConfirmation('Assignment Submitted', `Your submission for "${assignment.title}" has been submitted successfully and saved to Firebase!`, 'success');
                
                // Refresh the view
                if (currentView === 'assignments') {
                    showView('assignments');
                }
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        const newSubmission = {
            id: 'sub_' + Date.now(),
            assignmentId: assignmentId,
            studentId: currentUser.id,
            studentName: currentUser.name,
            studentRole: currentUser.role,
            submissionText: submissionText,
            submittedAt: new Date().toISOString(),
            attachment: null, // File handling can be implemented later
            grade: undefined,
            feedback: undefined,
            gradedAt: undefined,
            gradedBy: undefined
        };
        
        submissions.push(newSubmission);
        localStorage.setItem('submissions', JSON.stringify(submissions));
        
        closeSubmissionModal();
        showConfirmation('Assignment Submitted', `Your submission for "${assignment.title}" has been submitted successfully!`, 'success');
        
        // Refresh the view
        if (currentView === 'assignments') {
            showView('assignments');
        }
        
    } catch (error) {
        console.error('Error submitting assignment:', error);
        showConfirmation('Error', `Failed to submit assignment: ${error.message}`, 'error');
    }
}

// ===== STAFF GRADING =====
function viewAssignmentSubmissions(assignmentId) {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId);
    
    document.getElementById('viewSubmissionsTitle').textContent = `Submissions for: ${assignment.title}`;
    document.getElementById('viewSubmissionsContent').innerHTML = renderSubmissionsList(assignmentSubmissions, assignment);
    document.getElementById('viewSubmissionsModal').classList.remove('hidden');
}

function closeViewSubmissionsModal() {
    document.getElementById('viewSubmissionsModal').classList.add('hidden');
}

function renderSubmissionsList(submissionsList, assignment) {
    if (submissionsList.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Submissions Yet</h3>
                <p>No students have submitted this assignment yet.</p>
            </div>
        `;
    }
    
    return `
        <div class="assignment-info">
            <h4>Assignment Details</h4>
            <div class="meta-grid">
                <div class="meta-item">
                    <i class="fas fa-book"></i>
                    <span>Subject: ${assignment.subject}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Due: ${formatDate(assignment.dueDate)} ${assignment.dueTime || ''}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-star"></i>
                    <span>Max Score: ${assignment.maxScore} points</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <span>Total Submissions: ${submissionsList.length}</span>
                </div>
            </div>
        </div>
        
        <div class="submissions-list">
            ${submissionsList.map(submission => `
                <div class="submission-card">
                    <div class="submission-header">
                        <div>
                            <div class="submission-student">${submission.studentName}</div>
                            <div class="submission-date">Submitted: ${formatDate(submission.submittedAt)}</div>
                        </div>
                        ${submission.grade !== undefined ? 
                            `<span class="status-badge status-graded">Graded: ${submission.grade}/${assignment.maxScore}</span>` :
                            `<span class="status-badge status-submitted">Pending Review</span>`
                        }
                    </div>
                    
                    <div class="submission-content">
                        <div class="submission-text">${submission.submissionText}</div>
                        ${submission.attachment ? `
                            <div class="submission-file">
                                <i class="fas fa-paperclip"></i>
                                <span>Attachment: ${submission.attachment}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${submission.grade !== undefined ? `
                        <div class="submission-grade">
                            <div class="submission-score">Score: ${submission.grade}/${assignment.maxScore}</div>
                            <div>Graded: ${formatDate(submission.gradedAt)}</div>
                        </div>
                        ${submission.feedback ? `
                            <div class="submission-feedback">
                                <strong>Feedback:</strong><br>
                                ${submission.feedback}
                            </div>
                        ` : ''}
                    ` : ''}
                    
                    <div class="submission-actions">
                        ${submission.grade === undefined ? 
                            `<button class="btn btn-primary" onclick="openGradeModal('${submission.id}', ${assignment.maxScore})">
                                <i class="fas fa-star"></i> Grade Submission
                            </button>` :
                            `<button class="btn btn-secondary" onclick="openGradeModal('${submission.id}', ${assignment.maxScore})">
                                <i class="fas fa-edit"></i> Edit Grade
                            </button>`
                        }
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openGradeModal(submissionId, maxScore) {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        showConfirmation('Error', 'Submission not found.', 'error');
        return;
    }
    
    const assignment = assignments.find(a => a.id === submission.assignmentId);
    
    document.getElementById('gradeSubmissionInfo').innerHTML = `
        <div class="submission-info">
            <h4>Grading: ${submission.studentName}</h4>
            <p><strong>Assignment:</strong> ${assignment.title}</p>
            <p><strong>Submitted:</strong> ${formatDate(submission.submittedAt)}</p>
            <div class="submission-text">${submission.submissionText}</div>
        </div>
    `;
    
    document.getElementById('gradeSubmissionId').value = submissionId;
    document.getElementById('gradeScore').value = submission.grade || '';
    document.getElementById('gradeScore').setAttribute('max', maxScore);
    document.getElementById('gradeFeedback').value = submission.feedback || '';
    
    document.getElementById('gradeModal').classList.remove('hidden');
    
    // Focus on score field
    setTimeout(() => {
        document.getElementById('gradeScore').focus();
    }, 100);
}

function closeGradeModal() {
    document.getElementById('gradeModal').classList.add('hidden');
    document.getElementById('gradeForm').reset();
}

function saveGrade() {
    const form = document.getElementById('gradeForm');
    const formData = new FormData(form);
    const submissionId = formData.get('submissionId');
    const score = parseFloat(formData.get('score'));
    const feedback = formData.get('feedback');
    
    if (isNaN(score) || score < 0) {
        showConfirmation('Validation Error', 'Please enter a valid score.', 'error');
        return;
    }
    
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);
    if (submissionIndex === -1) {
        showConfirmation('Error', 'Submission not found.', 'error');
        return;
    }
    
    // Update submission with grade
    submissions[submissionIndex] = {
        ...submissions[submissionIndex],
        grade: score,
        feedback: feedback,
        gradedAt: new Date().toISOString(),
        gradedBy: currentUser.id
    };
    
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    closeGradeModal();
    showConfirmation('Grade Saved', 'The grade has been saved successfully!', 'success');
    
    // Refresh submissions view
    const assignment = assignments.find(a => a.id === submissions[submissionIndex].assignmentId);
    if (assignment) {
        viewAssignmentSubmissions(assignment.id);
    }
}

// ===== FILTER AND SEARCH FUNCTIONS =====
function filterAssignments(searchTerm) {
    const userSubmissions = submissions.filter(s => s.studentId === currentUser.id);
    let filteredAssignments = assignments;
    
    if (searchTerm) {
        filteredAssignments = assignments.filter(a => 
            a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    document.getElementById('assignmentsList').innerHTML = renderAssignmentCards(filteredAssignments, userSubmissions);
}

function filterAssignmentsBySubject(subject) {
    const userSubmissions = submissions.filter(s => s.studentId === currentUser.id);
    let filteredAssignments = assignments;
    
    if (subject) {
        filteredAssignments = assignments.filter(a => a.subject === subject);
    }
    
    document.getElementById('assignmentsList').innerHTML = renderAssignmentCards(filteredAssignments, userSubmissions);
}

function filterAssignmentsByStatus(status) {
    const userSubmissions = submissions.filter(s => s.studentId === currentUser.id);
    let filteredAssignments = assignments;
    
    if (status) {
        filteredAssignments = assignments.filter(assignment => {
            const submission = userSubmissions.find(s => s.assignmentId === assignment.id);
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            
            switch (status) {
                case 'pending':
                    return !submission && dueDate > now;
                case 'submitted':
                    return submission && submission.grade === undefined;
                case 'graded':
                    return submission && submission.grade !== undefined;
                case 'overdue':
                    return !submission && dueDate < now;
                default:
                    return true;
            }
        });
    }
    
    document.getElementById('assignmentsList').innerHTML = renderAssignmentCards(filteredAssignments, userSubmissions);
}

function filterStaffAssignments(searchTerm) {
    const submissionCounts = assignments.map(assignment => {
        const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
        return {
            ...assignment,
            submissionCount: assignmentSubmissions.length,
            gradedCount: assignmentSubmissions.filter(s => s.grade !== undefined).length
        };
    });
    
    let filteredAssignments = submissionCounts;
    
    if (searchTerm) {
        filteredAssignments = submissionCounts.filter(a => 
            a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    document.getElementById('staffAssignmentsList').innerHTML = renderStaffAssignmentCards(filteredAssignments);
}

function filterStaffAssignmentsBySubject(subject) {
    const submissionCounts = assignments.map(assignment => {
        const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
        return {
            ...assignment,
            submissionCount: assignmentSubmissions.length,
            gradedCount: assignmentSubmissions.filter(s => s.grade !== undefined).length
        };
    });
    
    let filteredAssignments = submissionCounts;
    
    if (subject) {
        filteredAssignments = submissionCounts.filter(a => a.subject === subject);
    }
    
    document.getElementById('staffAssignmentsList').innerHTML = renderStaffAssignmentCards(filteredAssignments);
}

// ===== VIEW DETAILS FUNCTIONS =====
function viewAssignmentDetails(assignmentId) {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
        showConfirmation('Error', 'Assignment not found.', 'error');
        return;
    }
    
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const isOverdue = dueDate < now;
    const timeLeft = dueDate - now;
    
    let timeLeftText = '';
    if (timeLeft > 0) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timeLeftText = days > 0 ? `${days} days, ${hours} hours remaining` : `${hours} hours remaining`;
    } else {
        timeLeftText = 'Overdue';
    }
    
    const modalContent = `
        <div class="assignment-info">
            <h4>${assignment.title}</h4>
            <p>${assignment.description}</p>
            <div class="meta-grid">
                <div class="meta-item">
                    <i class="fas fa-book"></i>
                    <span>Subject: ${assignment.subject}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Due: ${formatDate(assignment.dueDate)} ${assignment.dueTime || ''}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span class="${isOverdue ? 'overdue' : ''}">${timeLeftText}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-star"></i>
                    <span>Max Score: ${assignment.maxScore} points</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-user"></i>
                    <span>Created: ${formatDate(assignment.createdAt)}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('assignmentModalContent').innerHTML = modalContent;
    document.getElementById('assignmentModal').classList.remove('hidden');
}

function viewSubmissionDetails(submissionId) {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        showConfirmation('Error', 'Submission not found.', 'error');
        return;
    }
    
    const assignment = assignments.find(a => a.id === submission.assignmentId);
    
    const modalContent = `
        <div class="assignment-info">
            <h4>Your Submission: ${assignment.title}</h4>
            <div class="meta-grid">
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Submitted: ${formatDate(submission.submittedAt)}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-star"></i>
                    <span>Max Score: ${assignment.maxScore} points</span>
                </div>
                ${submission.grade !== undefined ? `
                    <div class="meta-item">
                        <i class="fas fa-trophy"></i>
                        <span>Your Score: ${submission.grade}/${assignment.maxScore}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>Graded: ${formatDate(submission.gradedAt)}</span>
                    </div>
                ` : `
                    <div class="meta-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span>Status: Awaiting Grade</span>
                    </div>
                `}
            </div>
        </div>
        
        <div class="submission-content">
            <h5>Your Solution:</h5>
            <div class="submission-text">${submission.submissionText}</div>
            ${submission.attachment ? `
                <div class="submission-file">
                    <i class="fas fa-paperclip"></i>
                    <span>Attachment: ${submission.attachment}</span>
                </div>
            ` : ''}
        </div>
        
        ${submission.feedback ? `
            <div class="submission-feedback">
                <h5>Instructor Feedback:</h5>
                ${submission.feedback}
            </div>
        ` : ''}
    `;
    
    document.getElementById('assignmentModalContent').innerHTML = modalContent;
    document.getElementById('assignmentModal').classList.remove('hidden');
}

// ===== PLACEHOLDER FUNCTIONS =====
function startMCQQuiz(mcqId) {
    showConfirmation('MCQ Quiz', 'MCQ quiz functionality will be implemented in the next update.', 'info');
}

function showCreateApplicationForm() {
    // Reset form
    document.getElementById('applicationForm').reset();
    
    // Show the modal
    document.getElementById('applicationModal').classList.remove('hidden');
}

async function submitApplication() {
    // Check if user has student role and is properly authenticated
    if (!requireCurrentUser('student', 'submit applications')) {
        return;
    }

    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const type = formData.get('type');
    const title = formData.get('title');
    const description = formData.get('description');
    
    if (!type || !title || !description) {
        showConfirmation('Validation Error', 'Please fill in all required fields.', 'error');
        return;
    }
    
    // Create new application object
    const createdBy = getCreatedByObject();
    const newApplication = {
        type: type,
        title: title,
        description: description,
        status: 'pending',
        submittedBy: currentUser.id,
        createdBy: createdBy,
        reviewedBy: null,
        reviewedAt: null,
        comment: null
    };
    
    // Handle file attachment if present
    const fileInput = document.getElementById('applicationFile');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        newApplication.attachment = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };
        
        // In a real application, you would upload the file to a server
        // For this demo, we'll just store the file metadata
        console.log('File attached:', file.name);
    }
    
    try {
        // Try to save to Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const applicationData = {
                type: type,
                title: title,
                description: description
            };
            
            const result = await createApplicationWithFirebase(applicationData);
            if (result.success) {
                // Add notification for student
                if (currentUser.role === 'student') {
                    addNotification('New Application Submitted', `Your ${type} application "${title}" has been submitted successfully and saved to Firebase.`, 'success');
                    
                    // Notify staff about new application
                    const staffNotification = {
                        id: 'notif_' + Date.now(),
                        title: 'New Application Submitted',
                        message: `Student ${currentUser.name} submitted a new ${type} application: "${title}"`,
                        type: 'info',
                        timestamp: new Date().toISOString(),
                        read: false,
                        targetRole: 'staff'
                    };
                    notifications.push(staffNotification);
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                }
                
                // Close modal and show success message
                closeApplicationModal();
                showConfirmation('Application Submitted', `Your ${type} application has been submitted successfully and saved to Firebase!`, 'success');
                
                // Refresh the applications view
                showView('applications');
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        const newApplication = {
            id: 'app_' + Date.now(),
            type: type,
            title: title,
            description: description,
            status: 'pending',
            submittedBy: currentUser.id,
            createdBy: createdBy,
            submittedAt: new Date().toISOString(),
            reviewedBy: null,
            reviewedAt: null,
            comment: null
        };
        
        // Handle file attachment if present
        const fileInput = document.getElementById('applicationFile');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            newApplication.attachment = {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            };
            
            // In a real application, you would upload the file to a server
            // For this demo, we'll just store the file metadata
            console.log('File attached:', file.name);
        }
        
        applications.push(newApplication);
        localStorage.setItem('applications', JSON.stringify(applications));
        
        // Add notification for student
        if (currentUser.role === 'student') {
            addNotification('New Application Submitted', `Your ${type} application "${title}" has been submitted successfully.`, 'success');
            
            // Notify staff about new application
            const staffNotification = {
                id: 'notif_' + Date.now(),
                title: 'New Application Submitted',
                message: `Student ${currentUser.name} submitted a new ${type} application: "${title}"`,
                type: 'info',
                timestamp: new Date().toISOString(),
                read: false,
                targetRole: 'staff'
            };
            notifications.push(staffNotification);
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }
        
        // Close modal and show success message
        closeApplicationModal();
        showConfirmation('Application Submitted', `Your ${type} application has been submitted successfully.`, 'success');
        
        // Refresh the applications view
        showView('applications');
        
    } catch (error) {
        console.error('Error submitting application:', error);
        showConfirmation('Error', `Failed to submit application: ${error.message}`, 'error');
    }
}

function viewApplication(applicationId) {
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        showConfirmation('Error', 'Application not found.', 'error');
        return;
    }
    
    const submitter = users.find(u => u.id === application.submittedBy);
    const reviewer = application.reviewedBy ? users.find(u => u.id === application.reviewedBy) : null;
    
    const modalContent = `
        <div class="application-details">
            <div class="application-header">
                <h4>${application.title}</h4>
                <span class="status-badge status-${application.status}">${application.status}</span>
            </div>
            
                            <div class="application-meta">
                    <div class="meta-item">
                        <i class="fas fa-tag"></i>
                        <span><strong>Type:</strong> ${application.type.charAt(0).toUpperCase() + application.type.slice(1)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span><strong>Submitted By:</strong> ${submitter ? submitter.name : 'Unknown'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Submitted:</strong> ${formatDate(application.submittedAt)}</span>
                    </div>
                    ${application.reviewedAt ? `
                        <div class="meta-item">
                            <i class="fas fa-user-check"></i>
                            <span><strong>Reviewed By:</strong> ${reviewer ? reviewer.name : 'Unknown'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span><strong>Reviewed:</strong> ${formatDate(application.reviewedAt)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="application-content">
                    <h5>Description:</h5>
                    <div class="description-text">${application.description}</div>
                    
                    ${application.attachment ? `
                        <div class="attachment-info">
                            <h5>Attachment:</h5>
                            <div class="file-info">
                                <i class="fas fa-paperclip"></i>
                                <span>${application.attachment.name}</span>
                                <small>(${formatFileSize(application.attachment.size)})</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${application.comment ? `
                        <div class="review-comment">
                            <h5>Review Comment:</h5>
                            <div class="comment-text">${application.comment}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('viewApplicationContent').innerHTML = modalContent;
    document.getElementById('viewApplicationModal').classList.remove('hidden');
}

function approveApplication(applicationId) {
    // Show review modal for approval
    showApplicationReviewModal(applicationId, 'approve');
}

function rejectApplication(applicationId) {
    // Show review modal for rejection
    showApplicationReviewModal(applicationId, 'reject');
}

function showApplicationReviewModal(applicationId, action) {
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        showConfirmation('Error', 'Application not found.', 'error');
        return;
    }
    
    const submitter = users.find(u => u.id === application.submittedBy);
    
    const modalContent = `
        <div class="application-review-preview">
            <h4>Review Application</h4>
            <div class="review-application-info">
                <p><strong>Title:</strong> ${application.title}</p>
                <p><strong>Type:</strong> ${application.type.charAt(0).toUpperCase() + application.type.slice(1)}</p>
                <p><strong>Submitted By:</strong> ${submitter ? submitter.name : 'Unknown'}</p>
                <p><strong>Description:</strong> ${application.description}</p>
            </div>
        </div>
    `;
    
    document.getElementById('applicationReviewContent').innerHTML = modalContent;
    document.getElementById('reviewApplicationId').value = applicationId;
    document.getElementById('applicationReviewModal').classList.remove('hidden');
}

async function approveApplicationWithComment() {
    const applicationId = document.getElementById('reviewApplicationId').value;
    const comment = document.getElementById('reviewComment').value;
    
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        showConfirmation('Error', 'Application not found.', 'error');
        return;
    }
    
    try {
        // Try to update in Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const result = await updateApplicationStatusWithFirebase(applicationId, 'approved', comment);
            if (result.success) {
                // Update local state
                application.status = 'approved';
                application.reviewedBy = currentUser.id;
                application.reviewedAt = new Date().toISOString();
                application.comment = comment || 'Application approved.';
                
                // Add notification for student
                const submitter = users.find(u => u.id === application.submittedBy);
                if (submitter) {
                    const notification = {
                        id: 'notif_' + Date.now(),
                        title: 'Application Approved',
                        message: `Your ${application.type} application "${application.title}" has been approved.`,
                        type: 'success',
                        timestamp: new Date().toISOString(),
                        read: false,
                        targetRole: 'student',
                        targetUser: application.submittedBy
                    };
                    notifications.push(notification);
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                }
                
                closeApplicationReviewModal();
                showConfirmation('Application Approved', `The application "${application.title}" has been approved and saved to Firebase!`, 'success');
                showView('applications');
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        application.status = 'approved';
        application.reviewedBy = currentUser.id;
        application.reviewedAt = new Date().toISOString();
        application.comment = comment || 'Application approved.';
        
        // Save to localStorage
        localStorage.setItem('applications', JSON.stringify(applications));
        
        // Add notification for student
        const submitter = users.find(u => u.id === application.submittedBy);
        if (submitter) {
            const notification = {
                id: 'notif_' + Date.now(),
                title: 'Application Approved',
                message: `Your ${application.type} application "${application.title}" has been approved.`,
                type: 'success',
                timestamp: new Date().toISOString(),
                read: false,
                targetRole: 'student',
                targetUser: application.submittedBy
            };
            notifications.push(notification);
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }
        
        closeApplicationReviewModal();
        showConfirmation('Application Approved', `The application "${application.title}" has been approved.`, 'success');
        showView('applications');
        
    } catch (error) {
        console.error('Error approving application:', error);
        showConfirmation('Error', `Failed to approve application: ${error.message}`, 'error');
    }
}

async function rejectApplicationWithComment() {
    const applicationId = document.getElementById('reviewApplicationId').value;
    const comment = document.getElementById('reviewComment').value;
    
    const application = applications.find(a => a.id === applicationId);
    if (!application) {
        showConfirmation('Error', 'Application not found.', 'error');
        return;
    }
    
    try {
        // Try to update in Firebase first
        if (window.firebaseServices && window.firebaseServices.isInitialized) {
            const result = await updateApplicationStatusWithFirebase(applicationId, 'rejected', comment);
            if (result.success) {
                // Update local state
                application.status = 'rejected';
                application.reviewedBy = currentUser.id;
                application.reviewedAt = new Date().toISOString();
                application.comment = comment || 'Application rejected.';
                
                // Add notification for student
                const submitter = users.find(u => u.id === application.submittedBy);
                if (submitter) {
                    const notification = {
                        id: 'notif_' + Date.now(),
                        title: 'Application Rejected',
                        message: `Your ${application.type} application "${application.title}" has been rejected.`,
                        type: 'warning',
                        timestamp: new Date().toISOString(),
                        read: false,
                        targetRole: 'student',
                        targetUser: application.submittedBy
                    };
                    notifications.push(notification);
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                }
                
                closeApplicationReviewModal();
                showConfirmation('Application Rejected', `The application "${application.title}" has been rejected and saved to Firebase!`, 'warning');
                showView('applications');
                return;
            }
        }
        
        // Fallback to local storage if Firebase is not available
        application.status = 'rejected';
        application.reviewedBy = currentUser.id;
        application.reviewedAt = new Date().toISOString();
        application.comment = comment || 'Application rejected.';
        
        // Save to localStorage
        localStorage.setItem('applications', JSON.stringify(applications));
        
        // Add notification for student
        const submitter = users.find(u => u.id === application.submittedBy);
        if (submitter) {
            const notification = {
                id: 'notif_' + Date.now(),
                title: 'Application Rejected',
                message: `Your ${application.type} application "${application.title}" has been rejected.`,
                type: 'warning',
                timestamp: new Date().toISOString(),
                read: false,
                targetRole: 'student',
                targetUser: application.submittedBy
            };
            notifications.push(notification);
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }
        
        closeApplicationReviewModal();
        showConfirmation('Application Rejected', `The application "${application.title}" has been rejected.`, 'warning');
        showView('applications');
        
    } catch (error) {
        console.error('Error rejecting application:', error);
        showConfirmation('Error', `Failed to reject application: ${error.message}`, 'error');
    }
}

function filterApplications() {
    const typeFilter = document.getElementById('applicationTypeFilter').value;
    const statusFilter = document.getElementById('applicationStatusFilter').value;
    const tableBody = document.getElementById('applicationsTableBody');
    
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const type = row.getAttribute('data-type');
        const status = row.getAttribute('data-status');
        
        const typeMatch = !typeFilter || type === typeFilter;
        const statusMatch = !statusFilter || status === statusFilter;
        
        if (typeMatch && statusMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function saveSettings() {
    showConfirmation('Settings Saved', 'Your settings have been saved successfully.', 'success');
}

// ===== MODAL CLOSE FUNCTIONS =====
function closeAssignmentModal() {
    document.getElementById('assignmentModal').classList.add('hidden');
}

function closeMCQModal() {
    document.getElementById('mcqModal').classList.add('hidden');
}

function closeApplicationModal() {
    document.getElementById('applicationModal').classList.add('hidden');
}

function closeViewApplicationModal() {
    document.getElementById('viewApplicationModal').classList.add('hidden');
}

function closeApplicationReviewModal() {
    document.getElementById('applicationReviewModal').classList.add('hidden');
}



// ===== ROLE MANAGEMENT FUNCTIONS =====
function showError(message) {
    // Implementation for showing error messages
    console.error('Error:', message);
    showConfirmation('Error', message, 'error');
}

function checkUserRole() {
    if (!currentUser) {
        console.warn('⚠️ No current user found');
        return null;
    }
    
    if (!currentUser.role) {
        console.warn('⚠️ User role missing in database');
        return null;
    }
    
    console.log(`🔐 Current user role: ${currentUser.role}`);
    return currentUser.role;
}

function hasRole(requiredRole) {
    const userRole = checkUserRole();
    if (!userRole) return false;
    
    const hasRequiredRole = userRole === requiredRole;
    console.log(`🔐 Role check: ${userRole} === ${requiredRole} = ${hasRequiredRole}`);
    return hasRequiredRole;
}

function requireRole(requiredRole, operation) {
    if (!hasRole(requiredRole)) {
        const errorMsg = `❌ Only ${requiredRole}s can ${operation}`;
        console.warn(errorMsg);
        showConfirmation('Permission Denied', errorMsg, 'error');
        return false;
    }
    return true;
}



// ===== PORTAL-BASED LOGIN SYSTEM =====

/**
 * Login function for staff portal
 * Checks user credentials and validates staff role from staff/{uid} collection
 */
async function loginStaffPortal(email, password) {
    try {
        console.log(`🔐 Staff Portal: Attempting login for: ${email}`);
        
        // Import Firebase auth functions
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        console.log(`✅ Firebase authentication successful for: ${user.email}`);
        
        // Check if user exists in staff collection
        console.log(`🔍 Staff Portal: Checking staff collection: /staff/${user.uid}`);
        let staffData = await getData('staff', user.uid);
        
        if (staffData) {
            
            
            // Validate user.uid is a string
            if (!user.uid || typeof user.uid !== 'string') {
                throw new Error(`Invalid user UID: ${user.uid} (type: ${typeof user.uid})`);
            }
            
            // Update last login
            console.log(`🔄 Updating last login for staff: /staff/${user.uid}`);
            await updateDataWithTimestamp('staff', user.uid, { lastLogin: new Date().toISOString() });
            
            // Store user info with staff role
            const userInfo = {
                uid: user.uid,
                email: user.email,
                name: staffData.name || staffData.displayName || email.split('@')[0],
                role: 'staff',
                department: staffData.department || 'General',
                portal: 'staff'
            };
            

            
            // Use the new setCurrentUser function to ensure proper synchronization
            setCurrentUser(userInfo);
            
            // Verify the role is properly set
            console.log(`🔐 Staff Portal - Final verification - Current user role: ${currentUser.role}`);
            
            // Sync current user across all systems
            if (typeof syncCurrentUser === 'function') {
                syncCurrentUser();
            }
            
            console.log(`✅ Staff login successful: ${userInfo.name}`);
            return { success: true, user: userInfo };
        } else {
            console.log(`❌ Staff Portal: User not found in staff collection: /staff/${user.uid}`);
            return { success: false, error: 'This account is not registered as staff. Please use the student portal or contact administrator.' };
        }
    } catch (error) {
        console.error('❌ Staff Portal login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login function for student portal
 * Checks user credentials and validates student role from students/{uid} collection
 */
async function loginStudentPortal(email, password) {
    try {
        console.log(`🔐 Student Portal: Attempting login for: ${email}`);
        
        // Import Firebase auth functions
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        console.log(`✅ Firebase authentication successful for: ${user.email}`);
        
        // Check if user exists in students collection
        console.log(`🔍 Student Portal: Checking students collection: /students/${user.uid}`);
        let studentData = await getData('students', user.uid);
        
        if (studentData) {

            console.log(`👤 Student name: ${studentData.name}`);
            console.log(`👤 Student department: ${studentData.department}`);
            
            // Validate user.uid is a string
            if (!user.uid || typeof user.uid !== 'string') {
                throw new Error(`Invalid user UID: ${user.uid} (type: ${typeof user.uid})`);
            }
            
            // Update last login
            console.log(`🔄 Updating last login for student: /students/${user.uid}`);
            await updateDataWithTimestamp('students', user.uid, { lastLogin: new Date().toISOString() });
            
            // Store user info with student role
            const userInfo = {
                uid: user.uid,
                email: user.email,
                name: studentData.name || studentData.displayName || email.split('@')[0],
                role: 'student',
                department: studentData.department || 'General',
                portal: 'student'
            };
            

            
            // Use the new setCurrentUser function to ensure proper synchronization
            setCurrentUser(userInfo);
            
            // Verify the role is properly set
            console.log(`🔐 Student Portal - Final verification - Current user role: ${currentUser.role}`);
            
            // Sync current user across all systems
            if (typeof syncCurrentUser === 'function') {
                syncCurrentUser();
            }
            
            console.log(`✅ Student login successful: ${userInfo.name}`);
            return { success: true, user: userInfo };
        } else {
            console.log(`❌ Student Portal: User not found in students collection: /students/${user.uid}`);
            return { success: false, error: 'This account is not registered as a student. Please use the staff portal or contact administrator.' };
        }
    } catch (error) {
        console.error('❌ Student Portal login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Universal login function that detects portal and calls appropriate login method
 * This maintains backward compatibility while implementing portal-based logic
 */
async function loginUser(email, password, portal = null) {
    try {
        console.log(`🔐 Universal login for: ${email} (Portal: ${portal || 'auto-detect'})`);
        
        // If portal is specified, use the appropriate login function
        if (portal === 'staff') {
            return await loginStaffPortal(email, password);
        } else if (portal === 'student') {
            return await loginStudentPortal(email, password);
        }
        
        // Auto-detect portal by checking both collections
        console.log(`🔍 Auto-detecting portal for user: ${email}`);
        
        // Import Firebase auth functions
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const user = userCredential.user;
        
        console.log(`✅ Firebase authentication successful for: ${user.email}`);
        
        // Check both collections to determine user type
        console.log(`🔍 Checking staff collection: /staff/${user.uid}`);
        let staffData = await getData('staff', user.uid);
        
        if (staffData) {
            console.log(`📊 User found in staff collection - redirecting to staff portal`);
            return await loginStaffPortal(email, password);
        }
        
        console.log(`🔍 Checking students collection: /students/${user.uid}`);
        let studentData = await getData('students', user.uid);
        
        if (studentData) {
            console.log(`📊 User found in students collection - redirecting to student portal`);
            return await loginStudentPortal(email, password);
        }
        
        // User not found in either collection
        console.log(`❌ User not found in any collection for UID: ${user.uid}`);
        return { success: false, error: 'User account not found. Please contact administrator to set up your account.' };
        
    } catch (error) {
        console.error('❌ Universal login error:', error);
        return { success: false, error: error.message };
    }
}



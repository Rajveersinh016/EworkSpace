// ===== FIREBASE SERVICES MODULE =====
// Comprehensive Firebase Realtime Database integration for all modules

class FirebaseServices {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    // Initialize Firebase services
    async initialize() {
        try {
            // Wait for Firebase to be available
            const checkFirebase = setInterval(() => {
                if (window.firebaseAuth && window.firebaseDb) {
                    this.auth = window.firebaseAuth;
                    this.db = window.firebaseDb;
                    this.isInitialized = true;
                    clearInterval(checkFirebase);
                    
                    console.log('✅ Firebase Services initialized successfully');
                    this.setupAuthListener();
                }
            }, 100);
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Services:', error);
        }
    }



    // Setup authentication state listener
    setupAuthListener() {
        if (!this.auth) return;
        
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ onAuthStateChanged }) => {
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    console.log('👤 User signed in:', user.email);
                    this.currentUser = user;
                    await this.ensureUserProfile(user);
                } else {
                    console.log('👤 User signed out');
                    this.currentUser = null;
                }
            });
        });
    }

    // Sync currentUser from main app
    syncCurrentUser() {
        if (typeof window !== 'undefined' && window.currentUser) {
            this.currentUser = window.currentUser;
            console.log('✅ Firebase services currentUser synced:', this.currentUser);
        }
    }

    // Ensure user profile exists in database
    async ensureUserProfile(user) {
        try {
            console.log(`🔐 Ensuring user profile for: ${user.email} (UID: ${user.uid})`);
            
            // Check if user profile exists in either collection
            let userData = await this.readData('staff', user.uid);
            let userRole = 'staff';
            
            if (!userData) {
                // Check students collection
                userData = await this.readData('students', user.uid);
                userRole = 'student';
            }
            
            if (!userData) {
                // User not found in either collection, create default student profile
                const userProfile = {
                    uid: user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'student', // Default role
                    department: 'General',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                await this.writeData('students', userProfile, user.uid);
                console.log('✅ Default student profile created:', userProfile);
                
                // Update currentUser with the new profile
                this.currentUser = userProfile;
            } else {
    
                
                // Set role based on collection
                userData.role = userRole;
                
                // Log role information
                if (userData.role === 'staff') {
                    console.log('🔐 Staff user profile detected');
                } else if (userData.role === 'student') {
                    console.log('🔐 Student user profile detected');
                }
                
                // Update last login in the appropriate collection
                await this.updateData(userRole, user.uid, { lastLogin: new Date().toISOString() });
                console.log(`✅ User profile updated with last login in ${userRole} collection`);
                
                // Update currentUser with the profile data
                this.currentUser = userData;
            }
            
            console.log(`🔐 Firebase Services - Current user role: ${this.currentUser.role}`);
            console.log(`🔐 Firebase Services - Current user object:`, this.currentUser);
            
            // Verify role checking functions work
            if (this.currentUser && this.currentUser.role) {
                const hasStaffRole = this.hasRole('staff');
                const hasStudentRole = this.hasRole('student');
                console.log(`🔐 Firebase Services - Role verification - Has staff role: ${hasStaffRole}, Has student role: ${hasStudentRole}`);
            }
            
        } catch (error) {
            console.error('❌ Error ensuring user profile:', error);
        }
    }

    // ===== CORE DATABASE OPERATIONS =====
    
    // Write data to Firebase (creates new record or overwrites existing)
    async writeData(path, data, customId = null) {
        try {
            if (!this.db) throw new Error('Firebase not initialized');
            
            const { ref, set, push } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            let dbRef;
            if (customId) {
                dbRef = ref(this.db, `${path}/${customId}`);
    
            } else {
                dbRef = ref(this.db, path);
                const newRef = push(dbRef);
                dbRef = newRef;
    
            }
            
            await set(dbRef, data);
            console.log('✅ Data written successfully');
            return customId || dbRef.key;
        } catch (error) {
            console.error('❌ Error writing data:', error);
            throw error;
        }
    }

    // Read data from Firebase
    async readData(path, id = null) {
        try {
            if (!this.db) throw new Error('Firebase not initialized');
            
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            if (id) {
                // Get single record
                const dbRef = ref(this.db, `${path}/${id}`);
                console.log(`📖 Reading from Firebase: ${path}/${id}`);
                const snapshot = await get(dbRef);
                
                if (snapshot.exists()) {
                    return { id: snapshot.key, ...snapshot.val() };
                } else {
                    return null;
                }
            } else {
                // Get all records at path
                const dbRef = ref(this.db, path);
                console.log(`📖 Reading from Firebase: ${path}`);
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
            console.error('❌ Error reading data:', error);
            throw error;
        }
    }

    // Update existing data in Firebase
    async updateData(path, id, data) {
        try {
            if (!this.db) throw new Error('Firebase not initialized');
            
            const { ref, update } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const dbRef = ref(this.db, `${path}/${id}`);
            console.log(`🔄 Updating Firebase: ${path}/${id}`);
            
            await update(dbRef, data);
            console.log('✅ Data updated successfully');
            return true;
        } catch (error) {
            console.error('❌ Error updating data:', error);
            throw error;
        }
    }

    // Delete data from Firebase
    async deleteData(path, id) {
        try {
            if (!this.db) throw new Error('Firebase not initialized');
            
            const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            
            const dbRef = ref(this.db, `${path}/${id}`);
            console.log(`🗑️ Deleting from Firebase: ${path}/${id}`);
            
            await remove(dbRef);
            console.log('✅ Data deleted successfully');
            return true;
        } catch (error) {
            console.error('❌ Error deleting data:', error);
            throw error;
        }
    }

    // ===== ASSIGNMENT MODULE FUNCTIONS =====
    
    // Create new assignment (Staff only)
    async createAssignment(assignmentData) {
        try {
            if (!this.currentUser || this.currentUser.role !== 'staff') {
                throw new Error('Only staff can create assignments');
            }
            
            const assignment = {
                ...assignmentData,
                createdBy: {
                    uid: this.currentUser.uid,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                },
                createdAt: new Date().toISOString(),
                status: 'active'
            };
            
            const assignmentId = await this.writeData('assignments', assignment);
            console.log('✅ Assignment created successfully:', assignmentId);
            
            return { success: true, assignmentId, assignment };
        } catch (error) {
            console.error('❌ Error creating assignment:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all assignments
    async getAssignments() {
        try {
            const assignments = await this.readData('assignments');
            console.log(`✅ Retrieved ${assignments.length} assignments`);
            return assignments;
        } catch (error) {
            console.error('❌ Error getting assignments:', error);
            return [];
        }
    }

    // Get assignments by staff member
    async getAssignmentsByStaff(staffId) {
        try {
            const assignments = await this.readData('assignments');
            const filteredAssignments = assignments.filter(a => a.createdBy === staffId);
            console.log(`✅ Retrieved ${filteredAssignments.length} assignments for staff ${staffId}`);
            return filteredAssignments;
        } catch (error) {
            console.error('❌ Error getting assignments by staff:', error);
            return [];
        }
    }

    // Submit assignment solution (Student only)
    async submitAssignment(assignmentId, submissionData) {
        try {
            if (!this.currentUser || this.currentUser.role !== 'student') {
                throw new Error('Only students can submit assignments');
            }
            
            const submission = {
                studentId: this.currentUser.uid,
                studentName: this.currentUser.name,
                studentRole: this.currentUser.role,
                assignmentId: assignmentId,
                answerText: submissionData.answerText || '',
                fileUrl: submissionData.fileUrl || '',
                submittedAt: new Date().toISOString(),
                status: 'Submitted'
            };
            
            // Save to /assignments/{assignmentId}/submissions/{studentUid}
            const submissionId = await this.writeData(`assignments/${assignmentId}/submissions`, submission, this.currentUser.uid);
            console.log('✅ Assignment submitted successfully:', submissionId);
            
            return { success: true, submissionId, submission };
        } catch (error) {
            console.error('❌ Error submitting assignment:', error);
            return { success: false, error: error.message };
        }
    }

    // Get submissions for an assignment
    async getSubmissions(assignmentId) {
        try {
            const submissions = await this.readData(`assignments/${assignmentId}/submissions`);
            console.log(`✅ Retrieved ${submissions.length} submissions for assignment ${assignmentId}`);
            return submissions;
        } catch (error) {
            console.error('❌ Error getting submissions:', error);
            return [];
        }
    }

    // Get student submissions
    async getStudentSubmissions(studentId) {
        try {
            // Get all assignments first
            const assignments = await this.readData('assignments');
            const studentSubmissions = [];
            
            // For each assignment, check if student has submitted
            for (const assignment of assignments) {
                try {
                    const submission = await this.readData(`assignments/${assignment.id}/submissions`, studentId);
                    if (submission) {
                        studentSubmissions.push({
                            ...submission,
                            assignmentTitle: assignment.title,
                            assignmentSubject: assignment.subject
                        });
                    }
                } catch (error) {
                    // Student hasn't submitted to this assignment, continue
                    continue;
                }
            }
            
            console.log(`✅ Retrieved ${studentSubmissions.length} submissions for student ${studentId}`);
            return studentSubmissions;
        } catch (error) {
            console.error('❌ Error getting student submissions:', error);
            return [];
        }
    }

    // ===== APPLICATION MODULE FUNCTIONS =====
    
    // Create new application (Student only)
    async createApplication(applicationData) {
        try {
            if (!this.currentUser || this.currentUser.role !== 'student') {
                throw new Error('Only students can create applications');
            }
            
            const application = {
                ...applicationData,
                studentId: this.currentUser.uid,
                createdBy: {
                    uid: this.currentUser.uid,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                },
                status: 'Pending',
                createdAt: new Date().toISOString()
            };
            
            const applicationId = await this.writeData('applications', application);
            console.log('✅ Application created successfully:', applicationId);
            
            return { success: true, applicationId, application };
        } catch (error) {
            console.error('❌ Error creating application:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all applications
    async getApplications() {
        try {
            const applications = await this.readData('applications');
            console.log(`✅ Retrieved ${applications.length} applications`);
            return applications;
        } catch (error) {
            console.error('❌ Error getting applications:', error);
            return [];
        }
    }

    // Get student applications
    async getStudentApplications(studentId) {
        try {
            const applications = await this.readData('applications');
            const filteredApplications = applications.filter(a => a.studentId === studentId);
            console.log(`✅ Retrieved ${filteredApplications.length} applications for student ${studentId}`);
            return filteredApplications;
        } catch (error) {
            console.error('❌ Error getting student applications:', error);
            return [];
        }
    }

    // Update application status (Staff only)
    async updateApplicationStatus(applicationId, status, comment = '') {
        try {
            if (!this.currentUser || this.currentUser.role !== 'staff') {
                throw new Error('Only staff can update application status');
            }
            
            const updateData = {
                status: status,
                reviewedBy: this.currentUser.uid,
                reviewedAt: new Date().toISOString()
            };
            
            if (comment) {
                updateData.reviewComment = comment;
            }
            
            await this.updateData('applications', applicationId, updateData);
            console.log('✅ Application status updated successfully:', status);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating application status:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== ANNOUNCEMENT MODULE FUNCTIONS =====
    
    // Create new announcement (Staff only)
    async createAnnouncement(announcementData) {
        try {
            if (!this.currentUser || this.currentUser.role !== 'staff') {
                throw new Error('Only staff can create announcements');
            }
            
            const announcement = {
                ...announcementData,
                createdBy: {
                    uid: this.currentUser.uid,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                },
                createdAt: new Date().toISOString(),
                isPublished: true,
                publishDate: new Date().toISOString(),
                readBy: []
            };
            
            const announcementId = await this.writeData('announcements', announcement);
            console.log('✅ Announcement created successfully:', announcementId);
            
            return { success: true, announcementId, announcement };
        } catch (error) {
            console.error('❌ Error creating announcement:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all announcements
    async getAnnouncements() {
        try {
            const announcements = await this.readData('announcements');
            console.log(`✅ Retrieved ${announcements.length} announcements`);
            return announcements;
        } catch (error) {
            console.error('❌ Error getting announcements:', error);
            return [];
        }
    }

    // Get announcements by target audience
    async getAnnouncementsByAudience(audience) {
        try {
            const announcements = await this.readData('announcements');
            const filteredAnnouncements = announcements.filter(a => 
                a.targetAudience === audience || a.targetAudience === 'all'
            );
            console.log(`✅ Retrieved ${filteredAnnouncements.length} announcements for audience: ${audience}`);
            return filteredAnnouncements;
        } catch (error) {
            console.error('❌ Error getting announcements by audience:', error);
            return [];
        }
    }

    // Mark announcement as read
    async markAnnouncementAsRead(announcementId) {
        try {
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }
            
            const announcement = await this.readData('announcements', announcementId);
            if (!announcement) {
                throw new Error('Announcement not found');
            }
            
            const readBy = announcement.readBy || [];
            if (!readBy.includes(this.currentUser.uid)) {
                readBy.push(this.currentUser.uid);
                await this.updateData('announcements', announcementId, { readBy });
                console.log('✅ Announcement marked as read');
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error marking announcement as read:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== SCHEDULE MODULE FUNCTIONS =====
    
    // Create new schedule event (Staff only)
    async createSchedule(scheduleData) {
        try {
            if (!this.currentUser || this.currentUser.role !== 'staff') {
                throw new Error('Only staff can create schedule events');
            }
            
            const schedule = {
                ...scheduleData,
                createdBy: {
                    uid: this.currentUser.uid,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                },
                createdAt: new Date().toISOString()
            };
            
            const scheduleId = await this.writeData('schedules', schedule);
            console.log('✅ Schedule event created successfully:', scheduleId);
            
            return { success: true, scheduleId, schedule };
        } catch (error) {
            console.error('❌ Error creating schedule event:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all schedule events
    async getSchedules() {
        try {
            const schedules = await this.readData('schedules');
            console.log(`✅ Retrieved ${schedules.length} schedule events`);
            return schedules;
        } catch (error) {
            console.error('❌ Error getting schedules:', error);
            return [];
        }
    }

    // Get schedule events by date range
    async getSchedulesByDateRange(startDate, endDate) {
        try {
            const schedules = await this.readData('schedules');
            const filteredSchedules = schedules.filter(schedule => {
                const scheduleDate = new Date(schedule.date);
                return scheduleDate >= startDate && scheduleDate <= endDate;
            });
            console.log(`✅ Retrieved ${filteredSchedules.length} schedule events for date range`);
            return filteredSchedules;
        } catch (error) {
            console.error('❌ Error getting schedules by date range:', error);
            return [];
        }
    }

    // Get today's schedule events
    async getTodaySchedules() {
        try {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            
            const schedules = await this.readData('schedules');
            const todaySchedules = schedules.filter(schedule => schedule.date === todayString);
            console.log(`✅ Retrieved ${todaySchedules.length} schedule events for today`);
            return todaySchedules;
        } catch (error) {
            console.error('❌ Error getting today\'s schedules:', error);
            return [];
        }
    }

    // ===== USER MANAGEMENT FUNCTIONS =====
    
    // Get user profile
    async getUserProfile(uid) {
        try {
            const userProfile = await this.readData('users', uid);
            console.log('✅ User profile retrieved:', uid);
            return userProfile;
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            return null;
        }
    }

    // Update user profile
    async updateUserProfile(uid, profileData) {
        try {
            if (!this.currentUser || this.currentUser.uid !== uid) {
                throw new Error('Users can only update their own profile');
            }
            
            await this.updateData('users', uid, profileData);
            console.log('✅ User profile updated successfully');
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all users
    async getAllUsers() {
        try {
            const users = await this.readData('users');
            console.log(`✅ Retrieved ${users.length} users`);
            return users;
        } catch (error) {
            console.error('❌ Error getting users:', error);
            return [];
        }
    }

    // Get users by role
    async getUsersByRole(role) {
        try {
            const users = await this.readData('users');
            const filteredUsers = users.filter(u => u.role === role);
            console.log(`✅ Retrieved ${filteredUsers.length} users with role: ${role}`);
            return filteredUsers;
        } catch (error) {
            console.error('❌ Error getting users by role:', error);
            return [];
        }
    }

    // ===== UTILITY FUNCTIONS =====
    
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Logout user
    async logout() {
        try {
            if (this.auth) {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await signOut(this.auth);
                this.currentUser = null;
                console.log('✅ User logged out successfully');
            }
        } catch (error) {
            console.error('❌ Error during logout:', error);
        }
    }
}

// Create global instance
const firebaseServices = new FirebaseServices();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    firebaseServices.initialize();
});

// Export for global use
window.firebaseServices = firebaseServices;

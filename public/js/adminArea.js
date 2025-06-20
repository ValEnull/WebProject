document.addEventListener('DOMContentLoaded', function() {
    // =============== INITIALIZATION ===============
    initTooltips();
    setupEventListeners();

    // =============== GLOBAL VARIABLES ===============
    let currentReviewId = null;
    let currentReportId = null;
    let currentUserId = null;

    // =============== CORE FUNCTIONS ===============

    /**
     * Initialize Bootstrap tooltips
     */
    function initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Review management
        setupReviewHandlers();
        
        // Report management
        setupReportHandlers();
        
        // User management
        setupUserHandlers();
        
        // UI components
        document.getElementById('showAllTopSellers')?.addEventListener('click', toggleTopSellers);
    }

    // =============== REVIEW MANAGEMENT ===============

    function setupReviewHandlers() {
        // Review viewing
        document.querySelectorAll('.view-review-btn').forEach(button => {
            button.addEventListener('click', handleReviewView);
        });

        // Review actions
        document.getElementById('approveReviewBtn')?.addEventListener('click', approveReview);
        document.getElementById('rejectReviewBtn')?.addEventListener('click', showDeleteReviewModal);
        document.getElementById('confirmDeleteReview')?.addEventListener('click', deleteReview);
    }

    function handleReviewView() {
        const button = this;
        currentReviewId = button.getAttribute('data-id');
        
        populateReviewModal(
            button.getAttribute('data-product'),
            button.getAttribute('data-user'),
            button.getAttribute('data-date'),
            currentReviewId,
            button.getAttribute('data-text'),
            button.getAttribute('data-reason'),
            parseInt(button.getAttribute('data-rating'))
        );
    }

    function populateReviewModal(product, user, date, id, text, reason, rating) {
        // Set basic info
        document.getElementById('reviewProduct').textContent = product;
        document.getElementById('reviewUser').textContent = user;
        document.getElementById('reviewDate').textContent = date;
        document.getElementById('reviewId').textContent = id;
        document.getElementById('reviewText').textContent = text;
        document.getElementById('reportReason').textContent = reason || 'No reason specified';
        
        // Render star rating
        renderRatingStars(rating);
    }

    function renderRatingStars(rating) {
        const starsContainer = document.getElementById('reviewRating');
        starsContainer.innerHTML = '';
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = i <= rating ? 'fas fa-star' : 'far fa-star';
            starsContainer.appendChild(star);
        }
    }

    function approveReview() {
        if (!currentReviewId) return;
        
        // TODO: Add actual API call to approve review
        console.log(`Review ${currentReviewId} approved`);
        
        closeModal('viewReviewModal');
        showAlert('success', 'Review approved successfully!');
        updateReviewStatus(currentReviewId, 'approved');
    }

    function showDeleteReviewModal() {
        if (!currentReviewId) return;
        showModal('deleteReviewModal');
    }

    function deleteReview() {
        if (!currentReviewId) return;
        
        // TODO: Add actual API call to delete review
        console.log(`Review ${currentReviewId} deleted`);
        
        closeModal('deleteReviewModal');
        closeModal('viewReviewModal');
        showAlert('success', 'Review deleted successfully!');
        updateReviewStatus(currentReviewId, 'deleted');
    }

    function updateReviewStatus(reviewId, action) {
        const row = document.querySelector(`.view-review-btn[data-id="${reviewId}"]`)?.closest('tr');
        if (!row) return;
        
        row.remove();
        showAlert('success', action === 'approved' 
            ? 'Review approved and removed from list' 
            : 'Review deleted successfully');
    }

    // =============== REPORT MANAGEMENT ===============

    function setupReportHandlers() {
        // Report viewing
        document.querySelectorAll('.view-report-btn').forEach(button => {
            button.addEventListener('click', handleReportView);
        });

        // Report resolution
        document.querySelectorAll('.btn-outline-success').forEach(button => {
            button.addEventListener('click', resolveReport);
        });

        // Report approval
        document.getElementById('approveReportBtn')?.addEventListener('click', approveReport);

        // All reports modal
        document.getElementById('allReportsModal')?.addEventListener('show.bs.modal', loadAllReports);
    }

    function handleReportView() {
        const button = this;
        currentReportId = button.getAttribute('data-id');
        
        populateReportModal(
            currentReportId,
            button.getAttribute('data-type'),
            button.getAttribute('data-user'),
            button.getAttribute('data-date'),
            button.getAttribute('data-product'),
            button.getAttribute('data-description')
        );
        
        document.getElementById('approveReportBtn').setAttribute('data-report-id', currentReportId);
    }

    function populateReportModal(id, type, user, date, product, description) {
        document.getElementById('reportId').textContent = id;
        document.getElementById('reportType').textContent = type;
        document.getElementById('reportUser').textContent = user;
        document.getElementById('reportDate').textContent = date;
        document.getElementById('reportProduct').textContent = product;
        document.getElementById('reportDescription').textContent = description;
    }

    function resolveReport() {
        const reportId = this.getAttribute('data-report-id');
        // TODO: Add actual API call to resolve report
        console.log(`Report ${reportId} marked as resolved`);
        
        const statusBadge = this.closest('tr').querySelector('.badge');
        if (statusBadge) {
            statusBadge.classList.remove('bg-warning');
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'Resolved';
        }
    }

    function approveReport() {
        const reportId = this.getAttribute('data-report-id');
        if (!reportId) return;
        
        // TODO: Add actual API call to approve report
        console.log(`Report ${reportId} approved`);
        
        closeModal('viewReportModal');
        showAlert('success', 'Report approved successfully!');
        removeReportRow(reportId);
    }

    function loadAllReports() {
        // TODO: Replace with actual API call
        const allReportsData = []; // Your report data here
        
        const tableBody = document.getElementById('allReportsTableBody');
        tableBody.innerHTML = '';
        
        allReportsData.forEach(report => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${report.id}</td>
                <td>${report.type}</td>
                <td>${report.user}</td>
                <td>${report.date}</td>
                <td>
                    <button class="btn btn-sm btn-outline-orange view-report-btn" 
                            data-bs-toggle="modal" 
                            data-bs-target="#viewReportModal"
                            data-id="${report.id}"
                            data-type="${report.type}"
                            data-user="${report.user}"
                            data-date="${report.date}"
                            data-product="${report.product}"
                            data-description="${report.description}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function removeReportRow(reportId) {
        // Remove from main table
        document.querySelector(`.view-report-btn[data-id="${reportId}"]`)?.closest('tr')?.remove();
        
        // Remove from all reports modal
        document.querySelector(`#allReportsTableBody .view-report-btn[data-id="${reportId}"]`)?.closest('tr')?.remove();
    }

    // =============== USER MANAGEMENT ===============

    function setupUserHandlers() {
        // User profile viewing
        document.querySelectorAll('.view-user-btn').forEach(button => {
            button.addEventListener('click', handleUserView);
        });

        // User actions
        document.getElementById('deleteUserBtn')?.addEventListener('click', showDeleteUserModal);
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', deleteUser);
        document.getElementById('confirmDeleteCheckbox')?.addEventListener('change', toggleDeleteButton);
    }

    function handleUserView() {
        const button = this;
        currentUserId = button.getAttribute('data-id');
        
        // TODO: Fetch actual user data
        const userData = {
            username: button.getAttribute('data-username'),
            name: button.getAttribute('data-name'),
            email: button.getAttribute('data-email'),
            regDate: button.getAttribute('data-regdate'),
            lastLogin: button.getAttribute('data-lastlogin'),
            status: button.getAttribute('data-status'),
            bio: button.getAttribute('data-bio')
        };
        
        populateUserModal(userData);
    }

    function populateUserModal(user) {
        document.getElementById('userProfileUsername').textContent = user.username;
        document.getElementById('userProfileName').textContent = user.name;
        document.getElementById('userProfileEmail').textContent = user.email;
        document.getElementById('userProfileRegDate').textContent = user.regDate;
        document.getElementById('userProfileLastLogin').textContent = user.lastLogin;
        document.getElementById('userProfileBio').textContent = user.bio;
        document.getElementById('userToDelete').textContent = user.username;
        
        // Set status badge
        const statusBadge = document.getElementById('userProfileStatus');
        statusBadge.textContent = user.status === 'active' ? 'Active' : 'Inactive';
        statusBadge.className = `badge bg-${user.status === 'active' ? 'success' : 'danger'}`;
    }

    function showDeleteUserModal() {
        showModal('confirmDeleteModal');
    }

    function toggleDeleteButton() {
        document.getElementById('confirmDeleteBtn').disabled = !this.checked;
    }

    function deleteUser() {
        if (!currentUserId) return;
        
        // TODO: Add actual API call to delete user
        console.log(`User ${currentUserId} deleted`);
        
        closeModal('confirmDeleteModal');
        closeModal('userProfileModal');
        showAlert('success', 'User deleted successfully!');
        
        // Remove user row from table
        document.querySelector(`.view-user-btn[data-id="${currentUserId}"]`)?.closest('tr')?.remove();
    }

    // =============== UI UTILITIES ===============

    function toggleTopSellers() {
        const extraRows = document.querySelectorAll('[data-top-seller="extra"]');
        const button = this;
        
        extraRows.forEach(row => row.classList.toggle('d-none'));
        
        // Toggle button text
        button.innerHTML = button.textContent.includes('Top 5') 
            ? '<i class="fas fa-chevron-up me-1"></i> Show Less' 
            : 'View All (Top 5)';
    }

    function showModal(modalId) {
        new bootstrap.Modal(document.getElementById(modalId)).show();
    }

    function closeModal(modalId) {
        bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
    }

    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.style.zIndex = '1100';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => alertDiv.remove(), 5000);
    }
});
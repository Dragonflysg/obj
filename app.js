// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const CURRENT_USER_ID = 'gs6368'; // Static user ID for development
const ITEMS_PER_PAGE = 6; // Maximum objectives per page

// State
// Get current year dynamically from system date
let currentYear = new Date().getFullYear();
let currentViewAs = 'Assignee';
let selectedObjective = null;
// Get current month dynamically based on system date
const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let currentMonth = monthAbbreviations[new Date().getMonth()];
let objectivesData = []; // Will be populated from API
let currentPage = 1;
let totalPages = 1;
let isViewingAll = false; // Track if we're viewing all objectives
let rolesData = []; // Will be populated from API

// Format date from YYYY-MM-DD to readable format (Mon DD YYYY)
function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';

    try {
        // Parse YYYY-MM-DD format
        const parts = dateStr.split('-');
        const year = parts[0];
        const month = parseInt(parts[1]) - 1; // 0-indexed
        const day = parseInt(parts[2]); // Remove leading zero

        const date = new Date(year, month, day);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${monthNames[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
    } catch (e) {
        return dateStr; // Return as-is if parsing fails
    }
}

// Initialize when document is ready
$(document).ready(function() {
    // Set year dropdown to current year
    $('#yearSelect').val(currentYear);

    setupEventListeners();
    fetchObjectives();
    loadRoles(); // Load roles for submit form
});

// Setup Event Listeners
function setupEventListeners() {
    // Year filter change
    $('#yearSelect').on('change', function() {
        currentYear = parseInt($(this).val());
        currentPage = 1;
        if (isViewingAll) {
            fetchAllObjectives();
        } else {
            fetchObjectives();
        }
    });

    // View As filter change
    $('#viewAsSelect').on('change', function() {
        currentViewAs = $(this).val();
        currentPage = 1;
        isViewingAll = false;
        updateSeeAllButton();
        fetchObjectives();
    });

    // Back button on update screen (in header filters)
    $('#editBackBtn').on('click', function() {
        closeUpdateScreen();
    });

    // Back button on submit screen
    $('#submitBackBtn2').on('click', function() {
        closeSubmitScreen();
    });

    // See All Objectives button
    $('.btn-see-all').on('click', function() {
        if (isViewingAll) {
            isViewingAll = false;
            currentPage = 1;
            fetchObjectives();
        } else {
            isViewingAll = true;
            currentPage = 1;
            fetchAllObjectives();
        }
        updateSeeAllButton();
    });

    // Submit New Objective button
    $('.btn-submit').on('click', function() {
        openSubmitScreen();
    });

    // Month tabs
    $('.month-tab').on('click', function() {
        $('.month-tab').removeClass('active');
        $(this).addClass('active');
        currentMonth = $(this).data('month');
        updateMonthDisplay();
    });

    // Pagination - Previous button
    $('#prevBtn').on('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderObjectives();
        }
    });

    // Pagination - Next button
    $('#nextBtn').on('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderObjectives();
        }
    });

    // Submit new objective form
    $('#submitNewBtn').on('click', function() {
        submitNewObjective();
    });

    // Submit objective updates
    $('.btn-submit-updates').on('click', function() {
        submitObjectiveUpdates();
    });

    // Delete objective
    $('.btn-delete').on('click', function() {
        deleteObjective();
    });
}

// Update See All button text and instruction
function updateSeeAllButton() {
    if (isViewingAll) {
        $('.btn-see-all').html('<span class="btn-icon">👤</span> My Objectives');
        $('.filter-instruction').text('Viewing All Objectives');
        $('#viewAsSelect').prop('disabled', true);
    } else {
        $('.btn-see-all').html('<span class="btn-icon">📋</span> See All Objectives');
        $('.filter-instruction').text('Please Select an Objective below to update');
        $('#viewAsSelect').prop('disabled', false);
    }
}

// Load roles from API
function loadRoles() {
    $.ajax({
        url: `${API_BASE_URL}/roles`,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                rolesData = data.roles;
                populateRoleDropdowns();
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading roles:', error);
        }
    });
}

// Populate Assignee and Owner dropdowns
function populateRoleDropdowns() {
    const $assigneeSelect = $('#submitAssignee');
    const $ownerSelect = $('#submitOwner');

    // Clear existing options
    $assigneeSelect.empty();
    $ownerSelect.empty();

    // Add placeholder option
    $assigneeSelect.append('<option value="">Select Assignee</option>');
    $ownerSelect.append('<option value="">Select Owner</option>');

    // Add roles to dropdowns
    $.each(rolesData, function(index, role) {
        const option = `<option value="${role.id}">${role.name}</option>`;
        $assigneeSelect.append(option);
        $ownerSelect.append(option);
    });
}

// Fetch Objectives from API
function fetchObjectives(isAutoRetry = false) {
    const requestBody = {
        year: currentYear
    };

    if (currentViewAs === 'Assignee') {
        requestBody.assignee = CURRENT_USER_ID;
    } else {
        requestBody.owner = CURRENT_USER_ID;
    }

    $.ajax({
        url: `${API_BASE_URL}/objectives`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestBody),
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                // Check if we got results
                if (data.objectives.length === 0 && currentViewAs === 'Assignee' && !isAutoRetry) {
                    // No results as Assignee, try as Owner
                    console.log('No objectives found as Assignee, trying as Owner...');
                    currentViewAs = 'Owner';
                    $('#viewAsSelect').val('Owner');
                    fetchObjectives(true); // Retry as Owner
                    return;
                }

                objectivesData = data.objectives;
                totalPages = Math.ceil(objectivesData.length / ITEMS_PER_PAGE);
                if (currentPage > totalPages) {
                    currentPage = totalPages || 1;
                }
                renderObjectives();
            } else {
                console.error('API returned error:', data.error);
                showError('Failed to load objectives');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error fetching objectives:', error);
            showError('Unable to connect to server. Please ensure the server is running.');
        }
    });
}

// Fetch All Objectives from API
function fetchAllObjectives() {
    $.ajax({
        url: `${API_BASE_URL}/objectives/all?year=${currentYear}`,
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                // Sort objectives by Assignee name alphabetically
                objectivesData = data.objectives.sort(function(a, b) {
                    return a.assignee.localeCompare(b.assignee);
                });
                totalPages = Math.ceil(objectivesData.length / ITEMS_PER_PAGE);
                if (currentPage > totalPages) {
                    currentPage = totalPages || 1;
                }
                renderObjectives();
            } else {
                console.error('API returned error:', data.error);
                showError('Failed to load objectives');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error fetching all objectives:', error);
            showError('Unable to connect to server. Please ensure the server is running.');
        }
    });
}

// Show error message in the grid
function showError(message) {
    $('#objectivesCount').text('0');
    $('#objectivesGrid').html(`
        <div class="error-message" style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
            color: #ff6b6b;
            font-size: 1.1rem;
        ">
            <p>${message}</p>
            <button onclick="fetchObjectives()" style="
                margin-top: 16px;
                padding: 10px 20px;
                background: #0288d1;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">Retry</button>
        </div>
    `);
    $('#paginationContainer').addClass('hidden');
}

// Render Objectives with Pagination
function renderObjectives() {
    $('#objectivesCount').text(objectivesData.length);
    $('#objectivesGrid').empty();

    if (objectivesData.length === 0) {
        $('#objectivesGrid').html(`
            <div class="no-objectives" style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px;
                color: #aaa;
                font-size: 1.1rem;
            ">
                <p>You have no Objectives for the year ${currentYear} either as Assignee or as the Owner.</p>
            </div>
        `);
        $('#paginationContainer').addClass('hidden');
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedObjectives = objectivesData.slice(startIndex, endIndex);

    // Render objectives for current page
    $.each(paginatedObjectives, function(index, obj) {
        const $tile = createObjectiveTile(obj);
        $('#objectivesGrid').append($tile);
    });

    // Update pagination controls
    updatePaginationControls();
}

// Update Pagination Controls
function updatePaginationControls() {
    if (objectivesData.length <= ITEMS_PER_PAGE) {
        $('#paginationContainer').addClass('hidden');
        return;
    }

    $('#paginationContainer').removeClass('hidden');

    // Update Previous/Next button states
    $('#prevBtn').prop('disabled', currentPage === 1);
    $('#nextBtn').prop('disabled', currentPage === totalPages);

    // Generate page numbers
    $('#pageNumbers').empty();
    for (let i = 1; i <= totalPages; i++) {
        const $pageBtn = $('<button>')
            .addClass('page-number')
            .addClass(i === currentPage ? 'active' : '')
            .text(i)
            .on('click', function() {
                currentPage = i;
                renderObjectives();
            });
        $('#pageNumbers').append($pageBtn);
    }
}

// Create Objective Tile
function createObjectiveTile(obj) {
    const closedClass = obj.status === 'Closed' ? 'closed' : '';

    const $tile = $('<div>')
        .addClass('objective-tile')
        .addClass(closedClass)
        .attr('data-id', obj.id)
        .html(`
            <div class="tile-header">
                <div class="tile-title">${obj.title}</div>
            </div>
            <div class="tile-body">
                <div class="tile-row">
                    <span class="tile-label"><span class="icon">👤</span> ${obj.status}</span>
                    <span class="rag-badge ${obj.rag.toLowerCase()}">${obj.rag}</span>
                </div>
                <div class="tile-row">
                    <span class="tile-label"><span class="icon">📅</span> From : ${formatDateForDisplay(obj.fromDate)}</span>
                    <span class="tile-value"><span class="icon">📅</span> To : ${formatDateForDisplay(obj.toDate)}</span>
                </div>
                <div class="tile-row">
                    <span class="tile-label"><span class="icon">👤</span> Assignee : ${obj.assignee}</span>
                    <span class="tile-value"><span class="icon">👤</span> Owner : ${obj.owner}</span>
                </div>
                <div class="tile-row">
                    <span class="tile-label"><span class="icon">📝</span> Last Updated on :</span>
                    <span class="tile-value">${formatDateForDisplay(obj.lastUpdated)}</span>
                </div>
            </div>
        `)
        .on('click', function() {
            openUpdateScreen(obj);
        });

    return $tile;
}

// Open Update Screen
function openUpdateScreen(obj) {
    selectedObjective = obj;

    // Populate form fields
    $('#updateTitle').text(obj.title);
    $('#statusSelect').val(obj.status === 'On-Going' ? 'In Progress' : obj.status);
    $('#ragSelect').val(obj.rag);
    $('#startDate').val(formatDateForInput(obj.fromDate));
    $('#targetDate').val(formatDateForInput(obj.toDate));
    $('#milestones').val(obj.milestones || '');
    $('#metrics').val(obj.metrics || '');

    // Set active month button to current month
    $('.month-tab').removeClass('active');
    $(`.month-tab[data-month="${currentMonth}"]`).addClass('active');

    updateMonthDisplay();

    // Switch to edit mode (hide buttons, transform filter bar)
    $('.header-filters').addClass('edit-mode');
    $('.app-container').addClass('edit-mode');

    // Slide to update screen
    $('.sliding-container').addClass('show-update');
}

// Close Update Screen
function closeUpdateScreen() {
    // Switch back to normal mode
    $('.header-filters').removeClass('edit-mode');
    $('.app-container').removeClass('edit-mode');

    // Slide back to main screen
    $('.sliding-container').removeClass('show-update');
}

// Open Submit Screen
function openSubmitScreen() {
    // Reset form fields
    $('#submitObjective').val('');
    $('#submitDescription').val('');
    $('#submitMilestones').val('');
    $('#submitMetrics').val('');
    $('#submitAssignee').val('');
    $('#submitOwner').val('');
    $('#submitCapital').val('');
    $('#submitStartDate').val('');
    $('#submitTargetDate').val('');

    // Switch to submit mode (hide buttons, transform filter bar)
    $('.header-filters').addClass('submit-mode');
    $('.app-container').addClass('submit-mode');

    // Slide to submit screen
    $('.sliding-container').addClass('show-submit');
}

// Close Submit Screen
function closeSubmitScreen() {
    // Switch back to normal mode
    $('.header-filters').removeClass('submit-mode');
    $('.app-container').removeClass('submit-mode');

    // Slide back to main screen
    $('.sliding-container').removeClass('show-submit');
}

// Submit New Objective
function submitNewObjective() {
    const newObjective = {
        title: $('#submitObjective').val(),
        description: $('#submitDescription').val(),
        milestones: $('#submitMilestones').val(),
        metrics: $('#submitMetrics').val(),
        assigneeID: $('#submitAssignee').val(),
        ownerID: $('#submitOwner').val(),
        capital: $('#submitCapital').val(),
        startDate: $('#submitStartDate').val(),
        targetDate: $('#submitTargetDate').val(),
        year: parseInt($('#submitYearSelect').val())
    };

    // Validate required fields
    if (!newObjective.title) {
        alert('Please enter an objective title');
        return;
    }
    if (!newObjective.assigneeID) {
        alert('Please select an assignee');
        return;
    }
    if (!newObjective.ownerID) {
        alert('Please select an owner');
        return;
    }
    if (!newObjective.capital) {
        alert('Please select a capital type');
        return;
    }
    if (!newObjective.startDate) {
        alert('Please select a start date');
        return;
    }
    if (!newObjective.targetDate) {
        alert('Please select a target date');
        return;
    }

    // Validate date logic
    const startDate = new Date(newObjective.startDate);
    const targetDate = new Date(newObjective.targetDate);

    if (targetDate <= startDate) {
        alert('Target date must be later than start date');
        return;
    }

    // Calculate difference in days
    const diffTime = targetDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        alert('Target date must be at least 30 days after start date');
        return;
    }

    // Make API call to create objective
    $.ajax({
        url: `${API_BASE_URL}/objectives/create`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(newObjective),
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                // Show success popup
                showSuccessPopup();

                // After 2 seconds, close submit screen and refresh
                setTimeout(function() {
                    // Set View As to Assignee (since only Assignees submit objectives)
                    currentViewAs = 'Assignee';
                    $('#viewAsSelect').val('Assignee');
                    isViewingAll = false;
                    updateSeeAllButton();

                    closeSubmitScreen();
                    // Refresh objectives list as Assignee
                    fetchObjectives();
                }, 2000);
            } else {
                alert('Error: ' + data.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error creating objective:', error);
            alert('Failed to create objective. Please ensure the server is running.');
        }
    });
}

// Show Success Popup
function showSuccessPopup() {
    $('#successPopup').addClass('show');
    setTimeout(function() {
        $('#successPopup').removeClass('show');
    }, 2000);
}

// Submit Objective Updates
function submitObjectiveUpdates() {
    if (!selectedObjective) {
        alert('No objective selected');
        return;
    }

    // Collect updated data from the form
    const updatedData = {
        status: $('#statusSelect').val(),
        rag: $('#ragSelect').val(),
        startDate: $('#startDate').val(),
        targetDate: $('#targetDate').val(),
        milestones: $('#milestones').val(),
        metrics: $('#metrics').val(),
        monthlyUpdates: selectedObjective.monthlyUpdates || {}
    };

    // Update the monthly updates with the current month's text
    updatedData.monthlyUpdates[currentMonth] = $('#monthlyUpdates').val();

    // Make API call to update objective
    $.ajax({
        url: `${API_BASE_URL}/objectives/update/${selectedObjective.id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedData),
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                // Show success popup
                showSuccessPopup();

                // After 2 seconds, close update screen and refresh
                setTimeout(function() {
                    closeUpdateScreen();
                    // Refresh objectives list
                    if (isViewingAll) {
                        fetchAllObjectives();
                    } else {
                        fetchObjectives();
                    }
                }, 2000);
            } else {
                alert('Error: ' + data.error);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error updating objective:', error);
            alert('Failed to update objective. Please ensure the server is running.');
        }
    });
}

// Delete Objective
function deleteObjective() {
    if (!selectedObjective) {
        alert('No objective selected');
        return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete this objective: "${selectedObjective.title}"?`)) {
        return;
    }

    // Dim the update screen
    $('.update-screen').addClass('dimmed');

    // Make API call to delete objective
    $.ajax({
        url: `${API_BASE_URL}/objectives/delete/${selectedObjective.id}`,
        method: 'DELETE',
        dataType: 'json',
        success: function(data) {
            if (data.success) {
                // Show delete popup
                $('#deletePopup').addClass('show');

                // After 2 seconds, close update screen and refresh
                setTimeout(function() {
                    $('#deletePopup').removeClass('show');
                    $('.update-screen').removeClass('dimmed');
                    closeUpdateScreen();
                    // Refresh objectives list
                    if (isViewingAll) {
                        fetchAllObjectives();
                    } else {
                        fetchObjectives();
                    }
                }, 2000);
            } else {
                $('.update-screen').removeClass('dimmed');
                alert('Error: ' + data.error);
            }
        },
        error: function(xhr, status, error) {
            $('.update-screen').removeClass('dimmed');
            console.error('Error deleting objective:', error);
            alert('Failed to delete objective. Please ensure the server is running.');
        }
    });
}

// Update Month Display
function updateMonthDisplay() {
    const monthNames = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
    };

    $('#selectedMonth').text(monthNames[currentMonth]);

    if (selectedObjective && selectedObjective.monthlyUpdates) {
        $('#monthlyUpdates').val(selectedObjective.monthlyUpdates[currentMonth] || '');
    } else {
        $('#monthlyUpdates').val('');
    }
}

// Format date for input (handles both "YYYY-MM-DD" and "Jan 1 2024" formats)
function formatDateForInput(dateStr) {
    if (!dateStr) return '';

    // If already in YYYY-MM-DD format, return as-is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }

    // Otherwise, convert from "Mon DD YYYY" format
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const parts = dateStr.split(' ');
    if (parts.length !== 3) return '';

    const month = months[parts[0]];
    const day = parts[1].padStart(2, '0');
    const year = parts[2];

    return `${year}-${month}-${day}`;
}

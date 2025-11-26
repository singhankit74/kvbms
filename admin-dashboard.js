// Admin Dashboard Logic with Multi-Branch & Fuel Entry Support
let currentUser = null;
let branches = [];
let managers = [];
let buses = [];
let readings = [];
let fuelEntries = [];
let selectedBranchFilter = '';

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth('admin');
    if (!currentUser) return;

    document.getElementById('adminName').textContent = currentUser.full_name;

    await loadDashboardData();

    // Set up event listeners
    document.getElementById('managerForm').addEventListener('submit', handleSaveManager);
    document.getElementById('dateRangeFilter').addEventListener('change', loadReadings);
    document.getElementById('fuelDateRangeFilter').addEventListener('change', loadFuelEntries);
    document.getElementById('branchFilter').addEventListener('change', handleBranchFilterChange);
});

async function loadDashboardData() {
    showLoading(true);
    try {
        await loadBranches();
        await Promise.all([
            loadManagers(),
            loadBuses(),
            loadReadings(),
            loadFuelEntries()
        ]);
        updateStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data');
    } finally {
        showLoading(false);
    }
}

async function loadBranches() {
    try {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('branch_name', { ascending: true });

        if (error) throw error;

        branches = data || [];

        // Populate branch filter dropdown
        const branchFilter = document.getElementById('branchFilter');
        const managerBranchSelect = document.getElementById('managerBranch');

        branchFilter.innerHTML = '<option value="">All Branches</option>' +
            branches.map(b => `<option value="${b.id}">${b.branch_name}</option>`).join('');

        managerBranchSelect.innerHTML = '<option value="">Select Branch</option>' +
            branches.map(b => `<option value="${b.id}">${b.branch_name}</option>`).join('');

    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

function handleBranchFilterChange() {
    selectedBranchFilter = document.getElementById('branchFilter').value;
    renderManagers();
    renderBuses();
    renderReadings();
    renderFuelEntries();
    updateStats();
}

async function loadManagers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                branch:branches(branch_name)
            `)
            .eq('role', 'vehicle_manager')
            .order('created_at', { ascending: false });

        if (error) throw error;

        managers = data || [];
        renderManagers();
    } catch (error) {
        console.error('Error loading managers:', error);
    }
}

function renderManagers() {
    const tbody = document.getElementById('managersTableBody');

    let filteredManagers = managers;
    if (selectedBranchFilter) {
        filteredManagers = managers.filter(m => m.branch_id === selectedBranchFilter);
    }

    if (filteredManagers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <h4>No managers yet</h4>
                        <p>Add your first vehicle manager to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredManagers.map(manager => `
        <tr>
            <td>${manager.full_name}</td>
            <td>${manager.email}</td>
            <td><span class="badge badge-primary">${manager.branch?.branch_name || 'Not Assigned'}</span></td>
            <td>${Utils.formatDate(manager.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" onclick="editManager('${manager.id}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteManager('${manager.id}')">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadBuses() {
    try {
        const { data, error } = await supabase
            .from('buses')
            .select(`
                *,
                branch:branches(branch_name),
                created_by_user:users!buses_created_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        buses = data || [];
        renderBuses();
    } catch (error) {
        console.error('Error loading buses:', error);
    }
}

function renderBuses() {
    const tbody = document.getElementById('busesTableBody');

    let filteredBuses = buses;
    if (selectedBranchFilter) {
        filteredBuses = buses.filter(b => b.branch_id === selectedBranchFilter);
    }

    if (filteredBuses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">🚌</div>
                        <h4>No buses yet</h4>
                        <p>Vehicle managers will add buses</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredBuses.map(bus => `
        <tr>
            <td><strong>${bus.bus_number}</strong></td>
            <td>${bus.driver_name}</td>
            <td>${bus.route_name}</td>
            <td><span class="badge badge-primary">${bus.branch?.branch_name || 'N/A'}</span></td>
            <td>${bus.created_by_user?.full_name || 'Unknown'}</td>
        </tr>
    `).join('');
}

async function loadReadings() {
    try {
        const dateRange = document.getElementById('dateRangeFilter').value;
        const { start, end } = DateUtils.getDateRange(dateRange);

        const { data, error } = await supabase
            .from('meter_readings')
            .select(`
                *,
                bus:buses(bus_number, driver_name, route_name, branch_id),
                branch:branches(branch_name),
                recorded_by_user:users!meter_readings_recorded_by_fkey(full_name)
            `)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        readings = data || [];
        renderReadings();
    } catch (error) {
        console.error('Error loading readings:', error);
    }
}

function renderReadings() {
    const tbody = document.getElementById('readingsTableBody');

    let filteredReadings = readings;
    if (selectedBranchFilter) {
        filteredReadings = readings.filter(r => r.branch_id === selectedBranchFilter);
    }

    if (filteredReadings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h4>No readings yet</h4>
                        <p>Meter readings will appear here</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredReadings.map(reading => {
        const isComplete = reading.return_reading !== null;
        const statusBadge = isComplete
            ? '<span class="badge badge-success">Complete</span>'
            : '<span class="badge badge-warning">Pending Return</span>';

        return `
            <tr>
                <td>${Utils.formatDate(reading.date)}</td>
                <td><span class="badge badge-primary">${reading.branch?.branch_name || 'N/A'}</span></td>
                <td><strong>${reading.bus?.bus_number || 'N/A'}</strong></td>
                <td>${reading.departure_reading}</td>
                <td>${reading.return_reading || '-'}</td>
                <td>${reading.distance_traveled ? reading.distance_traveled + ' km' : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewReadingDetails('${reading.id}')">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadFuelEntries() {
    try {
        const dateRange = document.getElementById('fuelDateRangeFilter').value;
        const { start, end } = DateUtils.getDateRange(dateRange);

        const { data, error } = await supabase
            .from('fuel_entries')
            .select(`
                *,
                bus:buses(bus_number, driver_name, route_name),
                branch:branches(branch_name),
                recorded_by_user:users!fuel_entries_recorded_by_fkey(full_name)
            `)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        fuelEntries = data || [];
        renderFuelEntries();
    } catch (error) {
        console.error('Error loading fuel entries:', error);
    }
}

function renderFuelEntries() {
    const tbody = document.getElementById('fuelEntriesTableBody');

    let filteredFuelEntries = fuelEntries;
    if (selectedBranchFilter) {
        filteredFuelEntries = fuelEntries.filter(f => f.branch_id === selectedBranchFilter);
    }

    if (filteredFuelEntries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-state-icon">⛽</div>
                        <h4>No fuel entries yet</h4>
                        <p>Fuel entries will appear here</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredFuelEntries.map(entry => `
        <tr>
            <td>${Utils.formatDate(entry.date)}</td>
            <td><span class="badge badge-primary">${entry.branch?.branch_name || 'N/A'}</span></td>
            <td><strong>${entry.bus?.bus_number || 'N/A'}</strong></td>
            <td>${entry.odometer_reading} km</td>
            <td>${entry.fuel_liters} L</td>
            <td>₹${entry.fuel_amount}</td>
            <td>${entry.recorded_by_user?.full_name || 'Unknown'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewFuelDetails('${entry.id}')">
                    View
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    let filteredBuses = buses;
    let filteredManagers = managers;
    let filteredReadings = readings;

    if (selectedBranchFilter) {
        filteredBuses = buses.filter(b => b.branch_id === selectedBranchFilter);
        filteredManagers = managers.filter(m => m.branch_id === selectedBranchFilter);
        filteredReadings = readings.filter(r => r.branch_id === selectedBranchFilter);
    }

    document.getElementById('totalBuses').textContent = filteredBuses.length;
    document.getElementById('totalManagers').textContent = filteredManagers.length;

    const today = DateUtils.getTodayDate();
    const todayReadings = filteredReadings.filter(r => r.date === today);
    document.getElementById('todayReadings').textContent = todayReadings.length;
}

// Manager CRUD Operations
function showAddManagerModal() {
    document.getElementById('managerModalTitle').textContent = 'Add Vehicle Manager';
    document.getElementById('managerForm').reset();
    document.getElementById('managerId').value = '';
    document.getElementById('managerPassword').required = true;
    Utils.showModal('managerModal');
}

function editManager(managerId) {
    const manager = managers.find(m => m.id === managerId);
    if (!manager) return;

    document.getElementById('managerModalTitle').textContent = 'Edit Vehicle Manager';
    document.getElementById('managerId').value = manager.id;
    document.getElementById('managerName').value = manager.full_name;
    document.getElementById('managerEmail').value = manager.email;
    document.getElementById('managerBranch').value = manager.branch_id || '';
    document.getElementById('managerPassword').value = '';
    document.getElementById('managerPassword').required = false;
    Utils.showModal('managerModal');
}

function closeManagerModal() {
    Utils.hideModal('managerModal');
    document.getElementById('managerForm').reset();
}

async function handleSaveManager(e) {
    e.preventDefault();

    const managerId = document.getElementById('managerId').value;
    const name = document.getElementById('managerName').value.trim();
    const email = document.getElementById('managerEmail').value.trim();
    const branchId = document.getElementById('managerBranch').value;
    const password = document.getElementById('managerPassword').value;

    if (!FormValidator.validateEmail(email)) {
        Utils.showError('managerError', 'Please enter a valid email address');
        return;
    }

    if (!branchId) {
        Utils.showError('managerError', 'Please select a branch');
        return;
    }

    Utils.setLoading('saveManagerBtn', true);

    try {
        if (managerId) {
            // Update existing manager
            const updateData = {
                full_name: name,
                email: email,
                branch_id: branchId,
                updated_at: new Date().toISOString()
            };

            if (password) {
                updateData.password_hash = password;
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', managerId);

            if (error) throw error;

            Utils.showSuccess('managerSuccess', 'Manager updated successfully!');
        } else {
            // Create new manager
            const { error } = await supabase
                .from('users')
                .insert({
                    email: email,
                    password_hash: password,
                    full_name: name,
                    role: 'vehicle_manager',
                    branch_id: branchId,
                    created_by: currentUser.id
                });

            if (error) throw error;

            Utils.showSuccess('managerSuccess', 'Manager created successfully!');
        }

        await loadManagers();
        updateStats();

        setTimeout(() => {
            closeManagerModal();
        }, 1500);

    } catch (error) {
        console.error('Error saving manager:', error);
        Utils.showError('managerError', error.message);
    } finally {
        Utils.setLoading('saveManagerBtn', false);
    }
}

async function deleteManager(managerId) {
    if (!confirm('Are you sure you want to delete this manager? This action cannot be undone.')) {
        return;
    }

    showLoading(true);

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', managerId);

        if (error) throw error;

        await loadManagers();
        updateStats();
        alert('Manager deleted successfully');
    } catch (error) {
        console.error('Error deleting manager:', error);
        alert('Failed to delete manager: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Reading Details
function viewReadingDetails(readingId) {
    const reading = readings.find(r => r.id === readingId);
    if (!reading) return;

    const content = document.getElementById('readingDetailsContent');
    content.innerHTML = `
        <div style="display: grid; gap: 20px;">
            <div>
                <strong>Date:</strong> ${Utils.formatDate(reading.date)}<br>
                <strong>Branch:</strong> ${reading.branch?.branch_name || 'N/A'}<br>
                <strong>Bus:</strong> ${reading.bus?.bus_number || 'N/A'}<br>
                <strong>Driver:</strong> ${reading.bus?.driver_name || 'N/A'}<br>
                <strong>Route:</strong> ${reading.bus?.route_name || 'N/A'}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="margin-bottom: 12px;">Departure</h4>
                    <strong>Reading:</strong> ${reading.departure_reading} km<br>
                    <strong>Time:</strong> ${Utils.formatTime(reading.departure_time)}<br>
                    <strong>Photo:</strong><br>
                    <img src="${reading.departure_photo_url}" alt="Departure" style="width: 100%; border-radius: 8px; margin-top: 8px;">
                </div>
                
                <div>
                    <h4 style="margin-bottom: 12px;">Return</h4>
                    ${reading.return_reading ? `
                        <strong>Reading:</strong> ${reading.return_reading} km<br>
                        <strong>Time:</strong> ${Utils.formatTime(reading.return_time)}<br>
                        <strong>Distance:</strong> ${reading.distance_traveled} km<br>
                        <strong>Photo:</strong><br>
                        <img src="${reading.return_photo_url}" alt="Return" style="width: 100%; border-radius: 8px; margin-top: 8px;">
                    ` : '<p style="color: var(--text-secondary);">Not yet recorded</p>'}
                </div>
            </div>
        </div>
    `;

    Utils.showModal('readingDetailsModal');
}

function closeReadingDetailsModal() {
    Utils.hideModal('readingDetailsModal');
}

// Fuel Entry Details
function viewFuelDetails(fuelId) {
    const fuel = fuelEntries.find(f => f.id === fuelId);
    if (!fuel) return;

    const content = document.getElementById('fuelDetailsContent');
    content.innerHTML = `
        <div style="display: grid; gap: 20px;">
            <div>
                <strong>Date:</strong> ${Utils.formatDate(fuel.date)}<br>
                <strong>Branch:</strong> ${fuel.branch?.branch_name || 'N/A'}<br>
                <strong>Bus:</strong> ${fuel.bus?.bus_number || 'N/A'}<br>
                <strong>Driver:</strong> ${fuel.bus?.driver_name || 'N/A'}<br>
                <strong>Route:</strong> ${fuel.bus?.route_name || 'N/A'}
            </div>
            
            <div>
                <h4 style="margin-bottom: 12px;">Fuel Details</h4>
                <strong>Odometer Reading:</strong> ${fuel.odometer_reading} km<br>
                <strong>Fuel Filled:</strong> ${fuel.fuel_liters} Liters<br>
                <strong>Amount Paid:</strong> ₹${fuel.fuel_amount}<br>
                <strong>Recorded By:</strong> ${fuel.recorded_by_user?.full_name || 'Unknown'}<br>
                <strong>Time:</strong> ${Utils.formatDateTime(fuel.created_at)}
            </div>
            
            <div>
                <h4 style="margin-bottom: 12px;">Meter Photo</h4>
                <img src="${fuel.meter_photo_url}" alt="Fuel Meter" style="width: 100%; border-radius: 8px;">
            </div>
        </div>
    `;

    Utils.showModal('fuelDetailsModal');
}

function closeFuelDetailsModal() {
    Utils.hideModal('fuelDetailsModal');
}

// Excel Export - Meter Readings
async function exportToExcel() {
    let dataToExport = readings;
    if (selectedBranchFilter) {
        dataToExport = readings.filter(r => r.branch_id === selectedBranchFilter);
    }

    if (dataToExport.length === 0) {
        alert('No readings to export');
        return;
    }

    showLoading(true);

    try {
        const exportData = dataToExport.map(reading => ({
            'Date': Utils.formatDate(reading.date),
            'Branch': reading.branch?.branch_name || 'N/A',
            'Bus Number': reading.bus?.bus_number || 'N/A',
            'Driver Name': reading.bus?.driver_name || 'N/A',
            'Route Name': reading.bus?.route_name || 'N/A',
            'Departure Reading (km)': reading.departure_reading,
            'Departure Time': Utils.formatDateTime(reading.departure_time),
            'Return Reading (km)': reading.return_reading || 'N/A',
            'Return Time': reading.return_time ? Utils.formatDateTime(reading.return_time) : 'N/A',
            'Distance Traveled (km)': reading.distance_traveled || 'N/A'
        }));

        const dateRange = document.getElementById('dateRangeFilter').value;
        const branchName = selectedBranchFilter ?
            branches.find(b => b.id === selectedBranchFilter)?.branch_name || 'filtered' :
            'all';
        const filename = `meter_readings_${branchName}_${dateRange}_${Date.now()}.xlsx`;

        await ExcelExporter.exportToExcel(exportData, filename);

        alert('Excel file downloaded successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Excel Export - Fuel Entries
async function exportFuelToExcel() {
    console.log('Exporting fuel entries, total:', fuelEntries.length);

    let dataToExport = fuelEntries;
    if (selectedBranchFilter) {
        dataToExport = fuelEntries.filter(f => f.branch_id === selectedBranchFilter);
    }

    console.log('Data to export after filter:', dataToExport.length);

    if (dataToExport.length === 0) {
        alert('No fuel entries to export');
        return;
    }

    showLoading(true);

    try {
        const exportData = dataToExport.map(fuel => {
            console.log('Processing fuel entry:', fuel);
            return {
                'Date': Utils.formatDate(fuel.date),
                'Branch': fuel.branch?.branch_name || 'N/A',
                'Bus Number': fuel.bus?.bus_number || 'N/A',
                'Driver Name': fuel.bus?.driver_name || 'N/A',
                'Route Name': fuel.bus?.route_name || 'N/A',
                'Odometer Reading (km)': fuel.odometer_reading,
                'Fuel Liters': fuel.fuel_liters,
                'Fuel Amount (₹)': fuel.fuel_amount,
                'Recorded By': fuel.recorded_by_user?.full_name || 'Unknown'
            };
        });

        console.log('Export data prepared:', exportData);

        const dateRange = document.getElementById('fuelDateRangeFilter').value;
        const branchName = selectedBranchFilter ?
            branches.find(b => b.id === selectedBranchFilter)?.branch_name || 'filtered' :
            'all';
        const filename = `fuel_entries_${branchName}_${dateRange}_${Date.now()}.xlsx`;

        await ExcelExporter.exportToExcel(exportData, filename);

        alert('Fuel report downloaded successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export fuel data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

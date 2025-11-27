// Vehicle Manager Dashboard Logic with Multi-Branch Support
let currentUser = null;
let userBranch = null;
let buses = [];
let todayReadings = [];
let fuelEntries = [];
let departurePhotoBlob = null;
let returnPhotoBlob = null;
let fuelPhotoBlob = null;

// Date range filters
let selectedReadingsDateRange = 'today';
let selectedFuelDateRange = 'week';

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth('vehicle_manager');
    if (!currentUser) return;

    document.getElementById('managerName').textContent = currentUser.full_name;

    // Load branch first
    await loadUserBranch();

    // Then load dashboard data if branch is assigned
    if (userBranch && userBranch.branch_id) {
        await loadDashboardData();
    } else {
        showLoading(false);
    }

    // Set up event listeners
    document.getElementById('busForm').addEventListener('submit', handleSaveBus);
    document.getElementById('departureForm').addEventListener('submit', handleSaveDeparture);
    document.getElementById('returnForm').addEventListener('submit', handleSaveReturn);
    document.getElementById('fuelEntryForm').addEventListener('submit', handleSaveFuelEntry);

    // Photo upload handlers
    document.getElementById('departurePhoto').addEventListener('change', handleDeparturePhotoSelect);
    document.getElementById('returnPhoto').addEventListener('change', handleReturnPhotoSelect);
    document.getElementById('fuelPhoto').addEventListener('change', handleFuelPhotoSelect);

    // Date range filter listeners
    document.getElementById('readingsDateRangeFilter').addEventListener('change', (e) => {
        selectedReadingsDateRange = e.target.value;
        loadMeterReadings();
    });

    document.getElementById('fuelDateRangeFilter').addEventListener('change', (e) => {
        selectedFuelDateRange = e.target.value;
        loadFuelEntries();
    });
});

async function loadUserBranch() {
    try {
        console.log('Loading branch for user:', currentUser.id);

        // First get the branch_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('branch_id')
            .eq('id', currentUser.id)
            .single();

        if (userError) {
            console.error('Error fetching user branch_id:', userError);
            document.getElementById('branchName').textContent = 'Error';
            return;
        }

        console.log('User data:', userData);

        if (!userData.branch_id) {
            console.warn('User has no branch_id assigned');
            document.getElementById('branchName').textContent = 'Not Assigned';
            userBranch = null;
            return;
        }

        // Then get the branch name
        const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('branch_name')
            .eq('id', userData.branch_id)
            .single();

        if (branchError) {
            console.error('Error fetching branch name:', branchError);
            document.getElementById('branchName').textContent = 'Error';
            return;
        }

        console.log('Branch data:', branchData);

        userBranch = {
            branch_id: userData.branch_id,
            branch: branchData
        };

        document.getElementById('branchName').textContent = branchData.branch_name;
        console.log('Branch loaded successfully:', branchData.branch_name);

    } catch (error) {
        console.error('Error loading user branch:', error);
        document.getElementById('branchName').textContent = 'Error';
    }
}

async function loadDashboardData() {
    showLoading(true);
    try {
        await Promise.all([
            loadBuses(),
            loadMeterReadings(),
            loadFuelEntries()
        ]);
        updateStats();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    } finally {
        showLoading(false);
    }
}

async function loadBuses() {
    try {
        if (!userBranch || !userBranch.branch_id) {
            console.log('Branch not loaded, skipping buses');
            return;
        }

        const { data, error } = await supabase
            .from('buses')
            .select('*')
            .eq('branch_id', userBranch.branch_id)  // Only filter by branch, not by creator
            .order('created_at', { ascending: false });

        if (error) throw error;

        buses = data || [];
        console.log('Buses loaded:', buses.length);
        renderBuses();
        populateBusSelects();
    } catch (error) {
        console.error('Error loading buses:', error);
    }
}

function renderBuses() {
    const tbody = document.getElementById('busesTableBody');

    if (buses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state-icon">🚌</div>
                        <h4>No buses yet</h4>
                        <p>Add your first bus to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = buses.map(bus => `
        <tr>
            <td><strong>${bus.bus_number}</strong></td>
            <td>${bus.driver_name}</td>
            <td>${bus.route_name}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-success" onclick="showRecordDepartureModal('${bus.id}')">
                        📝 Departure
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editBus('${bus.id}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBus('${bus.id}')">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function populateBusSelects() {
    const fuelBusSelect = document.getElementById('fuelBusSelect');
    fuelBusSelect.innerHTML = '<option value="">Choose a bus</option>' +
        buses.map(b => `<option value="${b.id}">${b.bus_number} - ${b.driver_name}</option>`).join('');
}

async function loadMeterReadings() {
    try {
        if (!userBranch || !userBranch.branch_id) {
            console.log('Branch not loaded, skipping readings');
            return;
        }

        // Calculate date range based on filter
        const today = new Date();
        let startDate;

        switch (selectedReadingsDateRange) {
            case 'today':
                startDate = DateUtils.getTodayDate();
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                startDate = weekAgo.toISOString().split('T')[0];
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setDate(today.getDate() - 30);
                startDate = monthAgo.toISOString().split('T')[0];
                break;
            default:
                startDate = DateUtils.getTodayDate();
        }

        const { data, error } = await supabase
            .from('meter_readings')
            .select(`
                *,
                bus:buses(bus_number, driver_name, route_name)
            `)
            .gte('date', startDate)
            .eq('branch_id', userBranch.branch_id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        todayReadings = data || [];
        console.log(`Meter readings loaded (${selectedReadingsDateRange}):`, todayReadings.length);
        renderTodayReadings();
    } catch (error) {
        console.error('Error loading meter readings:', error);
    }
}

function renderTodayReadings() {
    const tbody = document.getElementById('readingsTableBody');

    if (todayReadings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h4>No readings today</h4>
                        <p>Record departure readings for your buses</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = todayReadings.map(reading => {
        const isComplete = reading.return_reading !== null;
        const statusBadge = isComplete
            ? '<span class="badge badge-success">Complete</span>'
            : '<span class="badge badge-warning">Pending Return</span>';

        return `
            <tr>
                <td><strong>${reading.bus?.bus_number || 'N/A'}</strong></td>
                <td>${reading.departure_reading} km<br><small>${Utils.formatTime(reading.departure_time)}</small></td>
                <td>${reading.return_reading ? reading.return_reading + ' km<br><small>' + Utils.formatTime(reading.return_time) + '</small>' : '-'}</td>
                <td>${reading.distance_traveled ? reading.distance_traveled + ' km' : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    ${!isComplete ? `
                        <button class="btn btn-sm btn-success" onclick="showRecordReturnModal('${reading.id}')">
                            📝 Return
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-secondary" disabled>
                            ✓ Complete
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

async function loadFuelEntries() {
    try {
        if (!userBranch || !userBranch.branch_id) {
            console.log('Branch not loaded, skipping fuel entries');
            return;
        }

        // Calculate date range based on filter
        const today = new Date();
        let startDate;

        switch (selectedFuelDateRange) {
            case 'today':
                startDate = DateUtils.getTodayDate();
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                startDate = weekAgo.toISOString().split('T')[0];
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setDate(today.getDate() - 30);
                startDate = monthAgo.toISOString().split('T')[0];
                break;
            default:
                startDate = DateUtils.getTodayDate();
        }

        const { data, error } = await supabase
            .from('fuel_entries')
            .select(`
                *,
                bus:buses(bus_number, driver_name, route_name)
            `)
            .gte('date', startDate)
            .eq('branch_id', userBranch.branch_id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        fuelEntries = data || [];
        console.log(`Fuel entries loaded (${selectedFuelDateRange}):`, fuelEntries.length);
        renderFuelEntries();
    } catch (error) {
        console.error('Error loading fuel entries:', error);
    }
}

function renderFuelEntries() {
    const tbody = document.getElementById('fuelEntriesTableBody');

    if (fuelEntries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state-icon">⛽</div>
                        <h4>No fuel entries yet</h4>
                        <p>Add fuel entries for your buses</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = fuelEntries.map(entry => `
        <tr>
            <td>${Utils.formatDate(entry.date)}</td>
            <td><strong>${entry.bus?.bus_number || 'N/A'}</strong></td>
            <td>${entry.odometer_reading} km</td>
            <td>${entry.fuel_liters} L</td>
            <td>₹${entry.fuel_amount}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteFuelEntry('${entry.id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    document.getElementById('totalBuses').textContent = buses.length;
    document.getElementById('todayReadings').textContent = todayReadings.length;

    const pendingReturns = todayReadings.filter(r => r.return_reading === null);
    document.getElementById('pendingReturns').textContent = pendingReturns.length;

    const today = DateUtils.getTodayDate();
    const todayFuel = fuelEntries.filter(f => f.date === today);
    document.getElementById('todayFuelEntries').textContent = todayFuel.length;
}

// Bus CRUD Operations
function showAddBusModal() {
    document.getElementById('busModalTitle').textContent = 'Add Bus';
    document.getElementById('busForm').reset();
    document.getElementById('busId').value = '';
    Utils.showModal('busModal');
}

function editBus(busId) {
    const bus = buses.find(b => b.id === busId);
    if (!bus) return;

    document.getElementById('busModalTitle').textContent = 'Edit Bus';
    document.getElementById('busId').value = bus.id;
    document.getElementById('busNumber').value = bus.bus_number;
    document.getElementById('driverName').value = bus.driver_name;
    document.getElementById('routeName').value = bus.route_name;
    Utils.showModal('busModal');
}

function closeBusModal() {
    Utils.hideModal('busModal');
    document.getElementById('busForm').reset();
}

async function handleSaveBus(e) {
    e.preventDefault();

    const busId = document.getElementById('busId').value;
    const busNumber = document.getElementById('busNumber').value.trim();
    const driverName = document.getElementById('driverName').value.trim();
    const routeName = document.getElementById('routeName').value.trim();

    Utils.setLoading('saveBusBtn', true);

    try {
        if (busId) {
            const { error } = await supabase
                .from('buses')
                .update({
                    bus_number: busNumber,
                    driver_name: driverName,
                    route_name: routeName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', busId);

            if (error) throw error;
            Utils.showSuccess('busSuccess', 'Bus updated successfully!');
        } else {
            const { error } = await supabase
                .from('buses')
                .insert({
                    bus_number: busNumber,
                    driver_name: driverName,
                    route_name: routeName,
                    branch_id: userBranch.branch_id,
                    created_by: currentUser.id
                });

            if (error) throw error;
            Utils.showSuccess('busSuccess', 'Bus added successfully!');
        }

        await loadBuses();
        updateStats();

        setTimeout(() => {
            closeBusModal();
        }, 1500);

    } catch (error) {
        console.error('Error saving bus:', error);
        Utils.showError('busError', error.message);
    } finally {
        Utils.setLoading('saveBusBtn', false);
    }
}

async function deleteBus(busId) {
    if (!confirm('Are you sure you want to delete this bus? All associated meter readings will also be deleted.')) {
        return;
    }

    showLoading(true);

    try {
        const { error } = await supabase
            .from('buses')
            .delete()
            .eq('id', busId);

        if (error) throw error;

        await loadBuses();
        await loadMeterReadings();
        updateStats();
        alert('Bus deleted successfully');
    } catch (error) {
        console.error('Error deleting bus:', error);
        alert('Failed to delete bus: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Departure Recording
function showRecordDepartureModal(busId) {
    const bus = buses.find(b => b.id === busId);
    if (!bus) return;

    const today = DateUtils.getTodayDate();
    const existingReading = todayReadings.find(r => r.bus_id === busId);

    if (existingReading) {
        alert('Departure already recorded for this bus today');
        return;
    }

    document.getElementById('departureForm').reset();
    document.getElementById('departureBusId').value = bus.id;
    document.getElementById('departureBusNumber').value = bus.bus_number;
    departurePhotoBlob = null;
    document.getElementById('departurePreview').innerHTML = '';
    document.getElementById('departureInfo').innerHTML = '';
    document.getElementById('departureUploadWrapper').classList.remove('has-image');

    Utils.showModal('departureModal');
}

function closeDepartureModal() {
    Utils.hideModal('departureModal');
    document.getElementById('departureForm').reset();
    departurePhotoBlob = null;
}

async function handleDeparturePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validation = FormValidator.validateImage(file);
    if (!validation.valid) {
        Utils.showError('departureError', validation.message);
        return;
    }

    try {
        showLoading(true);

        const compressedBlob = await ImageCompressor.compressImage(file);
        departurePhotoBlob = compressedBlob;

        const url = URL.createObjectURL(compressedBlob);
        document.getElementById('departurePreview').innerHTML = `<img src="${url}" alt="Preview">`;
        document.getElementById('departureInfo').innerHTML = `
            Size: ${ImageCompressor.formatFileSize(compressedBlob.size)}
            ${compressedBlob.size > 200 * 1024 ? '<br><span style="color: var(--warning);">⚠️ Image is larger than 200KB</span>' : '<br><span style="color: var(--success);">✓ Image size OK</span>'}
        `;
        document.getElementById('departureUploadWrapper').classList.add('has-image');

    } catch (error) {
        console.error('Error compressing image:', error);
        Utils.showError('departureError', 'Failed to process image');
    } finally {
        showLoading(false);
    }
}

async function handleSaveDeparture(e) {
    e.preventDefault();

    const busId = document.getElementById('departureBusId').value;
    const reading = parseInt(document.getElementById('departureReading').value);

    if (!departurePhotoBlob) {
        Utils.showError('departureError', 'Please upload a meter photo');
        return;
    }

    Utils.setLoading('saveDepartureBtn', true);

    try {
        const photoFile = new File([departurePhotoBlob], `departure_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const photoUrl = await StorageManager.uploadImage(photoFile);

        const { error } = await supabase
            .from('meter_readings')
            .insert({
                bus_id: busId,
                branch_id: userBranch.branch_id,
                date: DateUtils.getTodayDate(),
                departure_reading: reading,
                departure_photo_url: photoUrl,
                departure_time: new Date().toISOString(),
                recorded_by: currentUser.id
            });

        if (error) throw error;

        Utils.showSuccess('departureSuccess', 'Departure recorded successfully!');

        await loadMeterReadings();
        updateStats();

        setTimeout(() => {
            closeDepartureModal();
        }, 1500);

    } catch (error) {
        console.error('Error saving departure:', error);
        Utils.showError('departureError', error.message);
    } finally {
        Utils.setLoading('saveDepartureBtn', false);
    }
}

// Return Recording
function showRecordReturnModal(readingId) {
    const reading = todayReadings.find(r => r.id === readingId);
    if (!reading) return;

    if (reading.return_reading !== null) {
        alert('Return already recorded for this reading');
        return;
    }

    document.getElementById('returnForm').reset();
    document.getElementById('returnReadingId').value = reading.id;
    document.getElementById('returnBusNumber').value = reading.bus?.bus_number || 'N/A';
    document.getElementById('returnDepartureReading').value = reading.departure_reading + ' km';
    returnPhotoBlob = null;
    document.getElementById('returnPreview').innerHTML = '';
    document.getElementById('returnInfo').innerHTML = '';
    document.getElementById('returnUploadWrapper').classList.remove('has-image');

    Utils.showModal('returnModal');
}

function closeReturnModal() {
    Utils.hideModal('returnModal');
    document.getElementById('returnForm').reset();
    returnPhotoBlob = null;
}

async function handleReturnPhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validation = FormValidator.validateImage(file);
    if (!validation.valid) {
        Utils.showError('returnError', validation.message);
        return;
    }

    try {
        showLoading(true);

        const compressedBlob = await ImageCompressor.compressImage(file);
        returnPhotoBlob = compressedBlob;

        const url = URL.createObjectURL(compressedBlob);
        document.getElementById('returnPreview').innerHTML = `<img src="${url}" alt="Preview">`;
        document.getElementById('returnInfo').innerHTML = `
            Size: ${ImageCompressor.formatFileSize(compressedBlob.size)}
            ${compressedBlob.size > 200 * 1024 ? '<br><span style="color: var(--warning);">⚠️ Image is larger than 200KB</span>' : '<br><span style="color: var(--success);">✓ Image size OK</span>'}
        `;
        document.getElementById('returnUploadWrapper').classList.add('has-image');

    } catch (error) {
        console.error('Error compressing image:', error);
        Utils.showError('returnError', 'Failed to process image');
    } finally {
        showLoading(false);
    }
}

async function handleSaveReturn(e) {
    e.preventDefault();

    const readingId = document.getElementById('returnReadingId').value;
    const returnReading = parseInt(document.getElementById('returnReading').value);

    if (!returnPhotoBlob) {
        Utils.showError('returnError', 'Please upload a meter photo');
        return;
    }

    const reading = todayReadings.find(r => r.id === readingId);
    if (returnReading < reading.departure_reading) {
        Utils.showError('returnError', 'Return reading must be greater than or equal to departure reading');
        return;
    }

    Utils.setLoading('saveReturnBtn', true);

    try {
        const photoFile = new File([returnPhotoBlob], `return_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const photoUrl = await StorageManager.uploadImage(photoFile);

        const { error } = await supabase
            .from('meter_readings')
            .update({
                return_reading: returnReading,
                return_photo_url: photoUrl,
                return_time: new Date().toISOString()
            })
            .eq('id', readingId);

        if (error) throw error;

        Utils.showSuccess('returnSuccess', 'Return recorded successfully!');

        await loadMeterReadings();
        updateStats();

        setTimeout(() => {
            closeReturnModal();
        }, 1500);

    } catch (error) {
        console.error('Error saving return:', error);
        Utils.showError('returnError', error.message);
    } finally {
        Utils.setLoading('saveReturnBtn', false);
    }
}

// Fuel Entry Operations
function showAddFuelEntryModal() {
    if (buses.length === 0) {
        alert('Please add a bus first before recording fuel entries');
        return;
    }

    document.getElementById('fuelEntryForm').reset();
    fuelPhotoBlob = null;
    document.getElementById('fuelPreview').innerHTML = '';
    document.getElementById('fuelInfo').innerHTML = '';
    document.getElementById('fuelUploadWrapper').classList.remove('has-image');

    Utils.showModal('fuelEntryModal');
}

function closeFuelEntryModal() {
    Utils.hideModal('fuelEntryModal');
    document.getElementById('fuelEntryForm').reset();
    fuelPhotoBlob = null;
}

async function handleFuelPhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const validation = FormValidator.validateImage(file);
    if (!validation.valid) {
        Utils.showError('fuelError', validation.message);
        return;
    }

    try {
        showLoading(true);

        const compressedBlob = await ImageCompressor.compressImage(file);
        fuelPhotoBlob = compressedBlob;

        const url = URL.createObjectURL(compressedBlob);
        document.getElementById('fuelPreview').innerHTML = `<img src="${url}" alt="Preview">`;
        document.getElementById('fuelInfo').innerHTML = `
            Size: ${ImageCompressor.formatFileSize(compressedBlob.size)}
            ${compressedBlob.size > 200 * 1024 ? '<br><span style="color: var(--warning);">⚠️ Image is larger than 200KB</span>' : '<br><span style="color: var(--success);">✓ Image size OK</span>'}
        `;
        document.getElementById('fuelUploadWrapper').classList.add('has-image');

    } catch (error) {
        console.error('Error compressing image:', error);
        Utils.showError('fuelError', 'Failed to process image');
    } finally {
        showLoading(false);
    }
}

async function handleSaveFuelEntry(e) {
    e.preventDefault();

    const busId = document.getElementById('fuelBusSelect').value;
    const odometerReading = parseInt(document.getElementById('odometerReading').value);
    const fuelLiters = parseFloat(document.getElementById('fuelLiters').value);
    const fuelAmount = parseFloat(document.getElementById('fuelAmount').value);

    if (!busId) {
        Utils.showError('fuelError', 'Please select a bus');
        return;
    }

    if (!fuelPhotoBlob) {
        Utils.showError('fuelError', 'Please upload a meter photo');
        return;
    }

    Utils.setLoading('saveFuelEntryBtn', true);

    try {
        const photoFile = new File([fuelPhotoBlob], `fuel_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const photoUrl = await StorageManager.uploadImage(photoFile);

        const { error } = await supabase
            .from('fuel_entries')
            .insert({
                bus_id: busId,
                branch_id: userBranch.branch_id,
                date: DateUtils.getTodayDate(),
                odometer_reading: odometerReading,
                fuel_liters: fuelLiters,
                fuel_amount: fuelAmount,
                meter_photo_url: photoUrl,
                recorded_by: currentUser.id
            });

        if (error) throw error;

        Utils.showSuccess('fuelSuccess', 'Fuel entry added successfully!');

        await loadFuelEntries();
        updateStats();

        setTimeout(() => {
            closeFuelEntryModal();
        }, 1500);

    } catch (error) {
        console.error('Error saving fuel entry:', error);
        Utils.showError('fuelError', error.message);
    } finally {
        Utils.setLoading('saveFuelEntryBtn', false);
    }
}

async function deleteFuelEntry(fuelId) {
    if (!confirm('Are you sure you want to delete this fuel entry?')) {
        return;
    }

    showLoading(true);

    try {
        const { error } = await supabase
            .from('fuel_entries')
            .delete()
            .eq('id', fuelId);

        if (error) throw error;

        await loadFuelEntries();
        updateStats();
        alert('Fuel entry deleted successfully');
    } catch (error) {
        console.error('Error deleting fuel entry:', error);
        alert('Failed to delete fuel entry: ' + error.message);
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

// Excel Export Functions for Vehicle Manager
async function exportReadingsToExcel() {
    if (todayReadings.length === 0) {
        alert('No readings to export');
        return;
    }

    showLoading(true);

    try {
        const exportData = todayReadings.map(reading => ({
            'Date': Utils.formatDate(reading.date),
            'Branch': userBranch.branch?.branch_name || 'N/A',
            'Bus Number': reading.bus?.bus_number || 'N/A',
            'Driver Name': reading.bus?.driver_name || 'N/A',
            'Route Name': reading.bus?.route_name || 'N/A',
            'Departure Reading (km)': reading.departure_reading,
            'Departure Time': Utils.formatTime(reading.departure_time),
            'Return Reading (km)': reading.return_reading || 'N/A',
            'Return Time': reading.return_time ? Utils.formatTime(reading.return_time) : 'N/A',
            'Distance Traveled (km)': reading.distance_traveled || 'N/A'
        }));

        const branchName = userBranch.branch?.branch_name || 'my_branch';
        const filename = `meter_readings_${branchName}_${selectedReadingsDateRange}_${Date.now()}.xlsx`;

        await ExcelExporter.exportToExcel(exportData, filename);

        alert('Excel file downloaded successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function exportFuelToExcel() {
    if (fuelEntries.length === 0) {
        alert('No fuel entries to export');
        return;
    }

    showLoading(true);

    try {
        const exportData = fuelEntries.map(fuel => ({
            'Date': Utils.formatDate(fuel.date),
            'Branch': userBranch.branch?.branch_name || 'N/A',
            'Bus Number': fuel.bus?.bus_number || 'N/A',
            'Driver Name': fuel.bus?.driver_name || 'N/A',
            'Route Name': fuel.bus?.route_name || 'N/A',
            'Odometer Reading (km)': fuel.odometer_reading,
            'Fuel Liters': fuel.fuel_liters,
            'Fuel Amount (₹)': fuel.fuel_amount,
            'Recorded By': currentUser.full_name
        }));

        const branchName = userBranch.branch?.branch_name || 'my_branch';
        const filename = `fuel_entries_${branchName}_${selectedFuelDateRange}_${Date.now()}.xlsx`;

        await ExcelExporter.exportToExcel(exportData, filename);

        alert('Fuel report downloaded successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export fuel data: ' + error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * CSV Analyzer - Advanced Processing Logic
 *
 * This script handles the loading, parsing, and analysis of CSV files formatted according to the IBA standard. It provides functionalities to display signals, navigate between samples, filter signals with wildcards, and search for specific events based on custom conditions.
 */

let csvData = {
    headers: [],
    units: [],
    timeRaw: [],   
    values: [],    
    selectedSignals: new Set(),
    chartSignal: null  // Currently displayed signal in the chart
};

let chart = null; // Global variable for the chart

// --- Initialization of Listeners ---
document.getElementById('csvFileInput').addEventListener('change', handleFile);
document.getElementById('filterInput').addEventListener('input', renderSignalList);
document.getElementById('timeSlider').addEventListener('input', (e) => updateUI(parseInt(e.target.value)));

// Step Buttons
document.getElementById('prevBtn').addEventListener('click', () => step(-1));
document.getElementById('nextBtn').addEventListener('click', () => step(1));

document.getElementById('findNextBtn').addEventListener('click', () => findEvent('next'));
document.getElementById('findPrevBtn').addEventListener('click', () => findEvent('prev'));

// Manual Sample Input
document.getElementById('sampleInput').addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (!isNaN(val)) updateUI(val);
});

/**
 * Checks if a signal contains numeric values (not string)
 */
function isNumericSignal(signalIndex) {
    for (let i = 0; i < csvData.values.length; i++) {
        const val = csvData.values[i][signalIndex];
        if (val !== null && val !== undefined && val !== '') {
            const numVal = parseFloat(val);
            if (isNaN(numVal)) {
                return false; // Found a non-numeric value
            }
        }
    }
    return true; // All values are numeric
}

/**
 * File loading handling
 */
function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        parseCSV(event.target.result);
        renderSignalList();
        setupSlider();
    };
    reader.readAsText(file);
}

/**
 * CSV parsing with IBA logic
 */
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    let currentIndex = 0;

    if (lines.length === 0) return;

    // Skip IBA info line
    if (lines[currentIndex].startsWith('Time[')) currentIndex++;

    // Signal Names
    const headerLine = lines[currentIndex].split(';');
    csvData.headers = headerLine.map(h => h.trim());
    currentIndex++;

    // Units Row
    const nextLine = lines[currentIndex].split(';');
    if (nextLine[0].trim().toLowerCase() === 'sec') {
        csvData.units = nextLine.map(u => u.trim());
        currentIndex++;
    } else {
        csvData.units = new Array(csvData.headers.length).fill('');
    }

    // Data
    csvData.timeRaw = [];
    csvData.values = [];
    
    for (let i = currentIndex; i < lines.length; i++) {
        const row = lines[i].split(';');
        if (row.length < csvData.headers.length) continue;

        csvData.timeRaw.push(row[0].trim());
        csvData.values.push(row.map((v, idx) => {
            if (idx === 0) return null;
            const val = v.trim();
            return val === "" ? null : val.replace(',', '.');
        }));
    }
    document.getElementById('fileStatus').innerText = `File ready: ${csvData.timeRaw.length} samples.`;
}

/**
 * Step navigation (±1)
 */
function step(direction) {
    const slider = document.getElementById('timeSlider');
    let newIndex = parseInt(slider.value) + direction;
    updateUI(newIndex);
}

/**
 * Initialization of controls
 */
function setupSlider() {
    const slider = document.getElementById('timeSlider');
    const sampleInput = document.getElementById('sampleInput');
    
    if (csvData.timeRaw.length > 0) {
        const maxIdx = csvData.timeRaw.length - 1;
        slider.max = maxIdx;
        slider.value = 0;
        sampleInput.max = maxIdx;
        sampleInput.value = 0;
        updateUI(0);
    }
}

/**
 * Renders signal list with wildcard
 */
function renderSignalList() {
    const container = document.getElementById('signalList');
    const filter = document.getElementById('filterInput').value.trim();
    container.innerHTML = '';

    let regex;
    if (filter === '') {
        regex = /.*/;
    } else {
        const pattern = filter.split('').map(char => {
            if (char === '*') return '.*';
            if (char === '?') return '.';
            return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');

        regex = new RegExp('^' + pattern + '$', 'i');
    }

    csvData.headers.forEach((name, index) => {
        if (index === 0) return; 

        if (regex.test(name)) {
            const div = document.createElement('div');
            div.className = `signal-item ${csvData.selectedSignals.has(index) ? 'selected' : ''}`;
            div.textContent = name;
            div.onclick = () => {
                if (csvData.selectedSignals.has(index)) {
                    csvData.selectedSignals.delete(index);
                } else {
                    csvData.selectedSignals.add(index);
                }
                renderSignalList(); 
                updateUI(parseInt(document.getElementById('timeSlider').value));
                updateSearchSignalSelect();
                updateChart();
            };
            
            container.appendChild(div);
        }
    });
}
function updateChart() {
    const ctx = document.getElementById('signalChart').getContext('2d');
    
    if (csvData.chartSignal === null) {
        if (chart) {
            chart.destroy();
            chart = null;
        }
        return;
    }

    const signalIndex = csvData.chartSignal;
    
    // Check if the signal is numeric
    if (!isNumericSignal(signalIndex)) {
        if (chart) {
            chart.destroy();
            chart = null;
        }
        csvData.chartSignal = null;
        // alert(`The signal "${csvData.headers[signalIndex]}" contains non-numeric values and cannot be plotted in the chart.`);
        return;
    }

    const signalName = csvData.headers[signalIndex];
    const signalValues = csvData.values.map(row => {
        const val = row[signalIndex];
        return val === null ? null : parseFloat(val);
    });

    const dataset = {
        label: signalName,
        data: signalValues,
        borderColor: '#36A2EB',
        backgroundColor: '#36A2EB20',
        tension: 0.1,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0
    };

    const chartData = {
        labels: csvData.timeRaw,
        datasets: [dataset]
    };

    const currentIndex = parseInt(document.getElementById('timeSlider').value);

const chartConfig = {
    type: 'line',
    data: chartData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            title: {
                display: true,
                text: `Signal: ${signalName}`
            },
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: false
            },
            x: {
                display: false
            }
        }
    },
    plugins: [{
        id: 'verticalLinePlugin',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            const xScale = chart.scales.x;
            const yScale = chart.scales.y;
            const currentIdx = parseInt(document.getElementById('timeSlider').value);
            const xPixel = xScale.getPixelForValue(currentIdx);
            ctx.save();
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(xPixel, yScale.top);
            ctx.lineTo(xPixel, yScale.bottom);
            ctx.stroke();
            ctx.restore();
        }
    }]
};

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, chartConfig);
}

/**
 * Core UI Update
 */
function updateUI(index) {
    if (index < 0) index = 0;
    if (index >= csvData.timeRaw.length) index = csvData.timeRaw.length - 1;

    document.getElementById('timeSlider').value = index;
    document.getElementById('sampleInput').value = index;
    
    document.getElementById('sampleIndexDisplay').textContent = index;
    document.getElementById('currentTimeDisplay').textContent = csvData.timeRaw[index] || '-';

    // Update the vertical line in the chart
    if (chart) {
        chart.update();
    }

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    csvData.selectedSignals.forEach(colIndex => {
        const val = csvData.values[index][colIndex];
        const displayVal = (val === null) ? '-' : val;
        
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        
        tr.innerHTML = `
            <td><strong>${csvData.headers[colIndex]}</strong></td>
            <td>${displayVal}</td>
            <td>${displayVal}</td>
            <td>${csvData.units[colIndex] || '-'}</td>
            <td><button class="remove-btn" data-index="${colIndex}">Remove</button></td>
        `;
        
        // Click on the row to select the signal in the chart
        tr.onclick = (e) => {
            if (e.target.classList.contains('remove-btn')) return;
            csvData.chartSignal = colIndex;
            updateChart();
            // Highlight the row
            document.querySelectorAll('#tableBody tr').forEach(r => r.style.backgroundColor = '');
            tr.style.backgroundColor = '#e3f2fd';
        };
        
        const btn = tr.querySelector('.remove-btn');
        btn.onclick = (e) => {
            e.stopPropagation();
            csvData.selectedSignals.delete(colIndex);
            // If the removed signal was in the chart, clear the chart
            if (csvData.chartSignal === colIndex) {
                csvData.chartSignal = null;
                updateChart();
            }
            renderSignalList();
            updateSearchSignalSelect();
            updateUI(index);
        };
        
        tableBody.appendChild(tr);
    });    
}
/**
 * Populates the search dropdown only with signals currently selected by the user
 */
function updateSearchSignalSelect() {
    const select = document.getElementById('searchSignalSelect');
    const searchValue = document.getElementById('searchValue');
    const currentSelection = select.value;
    
    select.innerHTML = '<option value="">Select signal...</option>';
    
    csvData.selectedSignals.forEach(index => {
        const name = csvData.headers[index];
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = name;
        select.appendChild(opt);
    });

    if (select.value === 'change') {
        searchValue.disabled = true;
    } else {
        searchValue.disabled = false;
    }

    select.value = currentSelection;
}

function findEvent(direction) {
    const signalIdx = parseInt(document.getElementById('searchSignalSelect').value);
    const type = document.getElementById('searchType').value;
    const targetVal = parseFloat(document.getElementById('searchValue').value.replace(',', '.'));
    const currentIndex = parseInt(document.getElementById('timeSlider').value);

    if (isNaN(signalIdx)) {
        alert("Select a signal from the search list.");
        return;
    }

    let start = (direction === 'next') ? currentIndex + 1 : currentIndex - 1;
    let end = (direction === 'next') ? csvData.values.length : -1;
    let step = (direction === 'next') ? 1 : -1;

    for (let i = start; i !== end; i += step) {
        const currentVal = parseFloat(csvData.values[i][signalIdx]);
        const prevVal = parseFloat(csvData.values[i - step][signalIdx]);

        if (isNaN(currentVal)) continue;

        let found = false;
        switch (type) {
            case 'change':
                if (currentVal !== prevVal && !isNaN(prevVal)) found = true;
                break;
            case 'equal':
                if (currentVal === targetVal) found = true;
                break;
            case 'greater':
                if (currentVal > targetVal) found = true;
                break;
            case 'less':
                if (currentVal < targetVal) found = true;
                break;
        }

        if (found) {
            updateUI(i);
            return;
        }
    }
    alert("No event found in the chosen direction.");
}

// --- Export Data Tab ---

function initializeExportData() {
    const exportBtn = document.getElementById('export-player-data-btn');
    const divisionSelect = document.getElementById('export-division-select');
    const statusDiv = document.getElementById('export-status');

    if (!exportBtn || !divisionSelect || !statusDiv) return;

    exportBtn.addEventListener('click', () => {
        const division = divisionSelect.value;
        const csvContent = generatePlayerCsv(division);
        downloadCsv(csvContent, `players_export_${division}.csv`);

        statusDiv.textContent = 'Export generated successfully!';
        statusDiv.className = 'status-success';
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    });
}

function generatePlayerCsv(division) {
    const headers = ['First Name', 'Last Name', 'Email', 'Team', 'Division', 'Role'];
    const rows = [headers.join(',')];

    allPlayersData.forEach(player => {
        const publicData = player.public || {};
        const privateData = player.private || {};

        if (division !== 'all' && publicData.division !== division) return;

        // Escape fields to handle commas and content
        const escape = (text) => `"${(text || '').toString().replace(/"/g, '""')}"`;

        const row = [
            escape(publicData.firstName),
            escape(publicData.lastName),
            escape(privateData.email),
            escape(teamsMap.get(publicData.teamId) || publicData.teamId || 'Unknown'),
            escape(publicData.division),
            escape(publicData.role)
        ];
        rows.push(row.join(','));
    });

    return rows.join('\n');
}

function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

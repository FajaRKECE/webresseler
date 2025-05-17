const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureReseller } = require('../middleware/authMiddleware');
const axios = require('axios');

router.get('/dashboard', ensureAuthenticated, ensureReseller, (req, res) => {
    res.render('reseller/dashboard', { pageTitle: 'Reseller Dashboard' });
});

router.post('/create-panel', ensureAuthenticated, ensureReseller, async (req, res) => {
    const {
        panelName, panelDescription, cpuLimit, memoryLimit, diskLimit,
        locationId, eggId, nodeId,
        environment // Objek dari form: environment[KEY]=VALUE
    } = req.body;

    const pteroApiUrl = process.env.PTERO_API_URL;
    const pteroApiKey = process.env.PTERO_API_KEY;

    if (!pteroApiUrl || !pteroApiKey) {
        req.flash('error_msg', 'Konfigurasi API Pterodactyl (URL/Key) belum lengkap di server.');
        return res.redirect('/reseller/dashboard');
    }

    if (!req.session.pterodactylUserId) {
        req.flash('error_msg', 'Akun Anda belum memiliki Pterodactyl User ID. Hubungi admin.');
        return res.redirect('/reseller/dashboard');
    }
    const pterodactylOwnerId = parseInt(req.session.pterodactylUserId);

    const payload = {
        name: panelName,
        description: panelDescription || `Server ${panelName} - ${req.session.username}`,
        user: pterodactylOwnerId,
        egg: parseInt(eggId),
        limits: {
            memory: parseInt(memoryLimit),
            swap: 0,
            disk: parseInt(diskLimit),
            io: 500,
            cpu: parseInt(cpuLimit)
        },
        feature_limits: {
            databases: 0,
            allocations: 1,
            backups: 0
        },
        environment: environment || {},
        start_on_completion: true,
    };

    if (nodeId && parseInt(nodeId) > 0) {
        payload.node = parseInt(nodeId);
        payload.allocation = { default: null };
    } else {
        payload.deploy = {
            locations: [parseInt(locationId)],
            dedicated_ip: false,
            port_range: []
        };
    }

    console.log("Pterodactyl API Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(`${pteroApiUrl}/api/application/servers`, payload, {
            headers: {
                'Authorization': `Bearer ${pteroApiKey}`,
                'Accept': 'Application/vnd.pterodactyl.v1+json',
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 201) {
            const serverDetails = response.data.attributes;
            req.flash('success_msg', `Panel "${serverDetails.name}" (ID Ptero: ${serverDetails.id}) berhasil dibuat!`);
        } else {
            req.flash('error_msg', `Gagal membuat panel. Pterodactyl merespon: ${response.status} - ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        console.error("Pterodactyl API error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        let errorMessage = `Terjadi kesalahan saat menghubungi API Pterodactyl.`;
        if (error.response && error.response.data && error.response.data.errors) {
            errorMessage += " Detail: " + error.response.data.errors.map(e => `(${e.code}) ${e.detail}`).join(', ');
        } else if (error.message) {
            errorMessage += ` Pesan: ${error.message}`;
        }
        req.flash('error_msg', errorMessage);
    }
    res.redirect('/reseller/dashboard');
});

module.exports = router;
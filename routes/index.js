const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const User = require('../models/user');

router.get('/', (req, res) => {
    res.render('index', {
        pageTitle: 'Selamat Datang',
    });
});

router.get('/profile', ensureAuthenticated, async (req, res) => {
    try {
        const userProfile = await User.findById(req.session.userId).select('-password');
        if (!userProfile) {
            req.flash('error_msg', 'User tidak ditemukan.');
            return res.redirect('/');
        }
        res.render('profile', {
            pageTitle: 'Profil Pengguna',
            userProfile: userProfile
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat profil.');
        res.redirect('/');
    }
});

module.exports = router;
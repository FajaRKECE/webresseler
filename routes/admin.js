const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard', ensureAuthenticated, ensureAdmin, (req, res) => {
    res.render('admin/dashboard', { pageTitle: 'Admin Dashboard' });
});

router.get('/users', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.render('admin/users', { pageTitle: 'Manajemen User', users: users });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal memuat daftar user.');
        res.redirect('/admin/dashboard');
    }
});

router.post('/users/:id/approve', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const userToApprove = await User.findById(req.params.id);
        if (!userToApprove) {
            req.flash('error_msg', 'User tidak ditemukan.');
            return res.redirect('/admin/users');
        }
        userToApprove.isApproved = true;
        userToApprove.role = 'reseller';
        await userToApprove.save();
        req.flash('success_msg', `User ${userToApprove.username} berhasil disetujui sebagai reseller.`);
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal menyetujui user.');
        res.redirect('/admin/users');
    }
});

router.post('/users/:id/reject', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const userToModify = await User.findById(req.params.id);
        if (!userToModify) {
            req.flash('error_msg', 'User tidak ditemukan.');
            return res.redirect('/admin/users');
        }
        userToModify.isApproved = false;
        userToModify.role = 'user';
        await userToModify.save();
        req.flash('success_msg', `Status reseller untuk ${userToModify.username} berhasil dibatalkan/ditolak.`);
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Gagal mengubah status user.');
        res.redirect('/admin/users');
    }
});

router.post('/users/:id/set-ptero-id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    const { pterodactylUserId } = req.body;
    try {
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) {
            req.flash('error_msg', 'User tidak ditemukan.');
            return res.redirect('/admin/users');
        }
        if (pterodactylUserId && isNaN(parseInt(pterodactylUserId))) {
            req.flash('error_msg', 'Pterodactyl User ID harus berupa angka.');
            return res.redirect('/admin/users');
        }
        userToUpdate.pterodactylUserId = pterodactylUserId ? parseInt(pterodactylUserId) : null;
        await userToUpdate.save();
        req.flash('success_msg', `Pterodactyl User ID untuk ${userToUpdate.username} berhasil diupdate.`);
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        if (err.code === 11000) { 
             req.flash('error_msg', 'Gagal update: Pterodactyl User ID tersebut sudah digunakan user lain.');
        } else {
            req.flash('error_msg', 'Gagal mengupdate Pterodactyl User ID.');
        }
        res.redirect('/admin/users');
    }
});


module.exports = router;
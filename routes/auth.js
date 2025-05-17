const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { forwardAuthenticated } = require('../middleware/authMiddleware');

router.get('/register', forwardAuthenticated, (req, res) => {
    res.render('auth/register', {
        pageTitle: 'Register Akun WFC PTERO',
        username: req.flash('form_username')[0] || '', 
        email: req.flash('form_email')[0] || ''
    });
});

router.post('/register', forwardAuthenticated, async (req, res) => {
    const { username, email, password, password2 } = req.body;
    let errors = [];

    if (!username || !email || !password || !password2) {
        errors.push({ msg: 'Mohon lengkapi semua field yang wajib diisi.' });
    }
    if (password !== password2) {
        errors.push({ msg: 'Konfirmasi password tidak cocok.' });
    }
    if (password.length < 6) {
        errors.push({ msg: 'Password minimal harus 6 karakter.' });
    }

    if (errors.length > 0) {
        req.flash('form_username', username);
        req.flash('form_email', email);
        return res.render('auth/register', {
            errors,
            username,
            email,
            pageTitle: 'Register Akun '
        });
    }

    try {
        let existingUser = await User.findOne({ $or: [{ email: email }, { username: username }] });
        if (existingUser) {
            if (existingUser.email === email) errors.push({ msg: 'Alamat email ini sudah terdaftar.' });
            if (existingUser.username === username) errors.push({ msg: 'Username ini sudah digunakan.' });
            req.flash('form_username', username);
            req.flash('form_email', email);
            return res.render('auth/register', {
                errors,
                username,
                email,
                pageTitle: 'Register Akun WFC PTERO'
            });
        }

        const newUser = new User({ username, email, password });
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            newUser.role = 'admin';
            newUser.isApproved = true;
        }

        await newUser.save();
        req.flash('success_msg', 'Registrasi berhasil! Silakan login. Akun Anda mungkin memerlukan approval admin.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error("Register error:", err);
        errors.push({ msg: 'Terjadi kesalahan pada server saat registrasi. Coba lagi nanti.' });
        req.flash('form_username', username);
        req.flash('form_email', email);
        res.render('auth/register', {
            errors,
            username,
            email,
            pageTitle: 'Register Akun WFC PTERO'
        });
    }
});

router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('auth/login', {
        pageTitle: 'Login ke WFC PTERO',
        email: req.flash('form_email')[0] || ''
    });
});

router.post('/login', forwardAuthenticated, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error_msg', 'Mohon isi email dan password.');
        req.flash('form_email', email);
        return res.redirect('/auth/login');
    }

    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            req.flash('error_msg', 'Email atau password yang Anda masukkan salah.');
            req.flash('form_email', email);
            return res.redirect('/auth/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Email atau password yang Anda masukkan salah.');
            req.flash('form_email', email);
            return res.redirect('/auth/login');
        }

        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.isApproved = user.isApproved;
        req.session.pterodactylUserId = user.pterodactylUserId;

        req.flash('success_msg', `Selamat datang kembali, ${user.username}!`);
        if (user.role === 'admin') {
            res.redirect('/admin/dashboard');
        } else if (user.role === 'reseller' && user.isApproved) {
            res.redirect('/reseller/dashboard');
        } else if (user.role === 'user' && !user.isApproved) {
            req.flash('info_msg', 'Akun Anda belum disetujui oleh admin untuk menjadi reseller.');
            res.redirect('/');
        } else {
            res.redirect('/');
        }

    } catch (err) {
        console.error("Login error:", err);
        req.flash('error_msg', 'Terjadi kesalahan pada server saat login. Coba lagi nanti.');
        req.flash('form_email', email);
        res.redirect('/auth/login');
    }
});

router.get('/logout', (req, res, next) => {
    const username = req.session.username || 'Pengguna'; // Ambil username sebelum sesi dihancurkan

    // Simpan pesan flash SEBELUM sesi dihancurkan
    req.flash('success_msg', `Anda berhasil logout dari WFC PTERO, ${username}.`);

    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            // Jika ada error saat destroy, flash message mungkin tidak sampai
            // Tapi kita tetap coba redirect
            res.clearCookie('connect.sid');
            // req.flash() di sini akan error, jadi jangan panggil lagi
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        // Pesan flash sudah diset sebelumnya
        res.redirect('/');
    });
});

module.exports = router;
module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.session.userId) {
            return next();
        }
        req.flash('error_msg', 'Silakan login untuk melihat halaman ini.');
        res.redirect('/auth/login');
    },
    ensureAdmin: function(req, res, next) {
        if (req.session.userId && req.session.role === 'admin') {
            return next();
        }
        req.flash('error_msg', 'Anda tidak memiliki akses admin.');
        res.redirect('/');
    },
    ensureReseller: function(req, res, next) {
        if (req.session.userId && req.session.role === 'reseller' && req.session.isApproved) {
            return next();
        }
        if (req.session.userId && req.session.role === 'user' && !req.session.isApproved) {
            req.flash('info_msg', 'Akun Anda belum disetujui oleh admin untuk menjadi reseller.');
            res.redirect('/');
        } else {
            req.flash('error_msg', 'Anda tidak memiliki akses reseller atau akun belum disetujui.');
            res.redirect('/auth/login');
        }
    },
    forwardAuthenticated: function(req, res, next) {
        if (req.session.userId) {
            if (req.session.role === 'admin') res.redirect('/admin/dashboard');
            else if (req.session.role === 'reseller') res.redirect('/reseller/dashboard');
            else res.redirect('/');
        } else {
            return next();
        }
    }
};
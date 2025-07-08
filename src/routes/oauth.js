const express = require('express');
const passport = require('passport');
const { storeUserData, checkProjectBlockedAndRedirect } = require('../middleware/auth');
const router = express.Router();

// Discord OAuth
router.get('/discord', checkProjectBlockedAndRedirect, passport.authenticate('discord'));

router.get('/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/auth/failure' }),
    async (req, res) => {
        try {
            const token = await storeUserData(req.user);
            res.send(`<script>
                window.opener.postMessage({type: 'AUTH_SUCCESS', token: '${token}'}, '*');
                window.close();
            </script>`);
        } catch (error) {
            console.error('Discord auth error:', error);
            res.redirect('/auth/failure');
        }
    }
);

// Google OAuth
router.get('/google', checkProjectBlockedAndRedirect, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/failure' }),
    async (req, res) => {
        try {
            const token = await storeUserData(req.user);
            res.send(`<script>
                window.opener.postMessage({type: 'AUTH_SUCCESS', token: '${token}'}, '*');
                window.close();
            </script>`);
        } catch (error) {
            console.error('Google auth error:', error);
            res.redirect('/auth/failure');
        }
    }
);

// GitHub OAuth
router.get('/github', checkProjectBlockedAndRedirect, passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth/failure' }),
    async (req, res) => {
        try {
            const token = await storeUserData(req.user);
            res.send(`<script>
                window.opener.postMessage({type: 'AUTH_SUCCESS', token: '${token}'}, '*');
                window.close();
            </script>`);
        } catch (error) {
            console.error('GitHub auth error:', error);
            res.redirect('/auth/failure');
        }
    }
);

module.exports = router;

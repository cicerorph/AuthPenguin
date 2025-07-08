const express = require('express');
const crypto = require('crypto');
const { storeUserData, checkProjectBlockedAndRedirect } = require('../middleware/auth');
const router = express.Router();

// SoundCloud OAuth
router.get('/soundcloud', checkProjectBlockedAndRedirect, (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    req.session.soundcloud = { state, codeVerifier };
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.SOUNDCLOUD_CLIENT_ID,
        redirect_uri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/soundcloud/callback`,
        scope: 'non-expiring',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });
    
    res.redirect(`https://secure.soundcloud.com/connect?${params}`);
});

router.get('/soundcloud/callback', async (req, res) => {
    if (req.query.error) {
        return res.redirect('/auth/failure');
    }
    
    if (!req.query.code) {
        return res.redirect('/auth/soundcloud');
    }

    try {
        if (!req.session.soundcloud || req.query.state !== req.session.soundcloud.state) {
            return res.redirect('/auth/failure');
        }
        
        const { codeVerifier } = req.session.soundcloud;
        delete req.session.soundcloud;
        
        const tokenResponse = await fetch('https://secure.soundcloud.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.SOUNDCLOUD_CLIENT_ID,
                client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET,
                redirect_uri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/soundcloud/callback`,
                code_verifier: codeVerifier,
                code: req.query.code
            })
        });
        
        if (!tokenResponse.ok) {
            console.log('Failed to get access token');
            return res.redirect('/auth/failure');
        }
        
        const tokenData = await tokenResponse.json();
        
        const userResponse = await fetch('https://api.soundcloud.com/me', {
            headers: {
                'Authorization': `OAuth ${tokenData.access_token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!userResponse.ok) {
            console.log('Failed to get user data');
            return res.redirect('/auth/failure');
        }
        
        const userData = await userResponse.json();

        const user = {
            id: userData.id,
            username: userData.username,
            displayName: userData.username,
            name: userData.full_name,
            email: null,
            avatar: userData.avatar_url,
            provider: 'soundcloud',
            soundcloud: {
                permalink_url: userData.permalink_url,
                city: userData.city,
                country: userData.country,
                description: userData.description,
                followers_count: userData.followers_count,
                followings_count: userData.followings_count,
                track_count: userData.track_count,
                likes_count: userData.likes_count,
                playlist_count: userData.playlist_count,
                website: userData.website,
                website_title: userData.website_title,
                created_at: userData.created_at,
                plan: userData.plan,
                private_tracks_count: userData.private_tracks_count
            }
        };
        
        const token = await storeUserData(user);
        
        res.send(`<script>
            window.opener.postMessage({type: 'AUTH_SUCCESS', token: '${token}'}, '*');
            window.close();
        </script>`);
        
    } catch (error) {
        console.error('SoundCloud authentication error:', error);
        res.redirect('/auth/failure');
    }
});

module.exports = router;

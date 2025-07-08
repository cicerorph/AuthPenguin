const crypto = require('crypto');

const SoundCloudStrategy = function(options, verify) {
    this.name = 'soundcloud';
    this.clientID = options.clientID;
    this.clientSecret = options.clientSecret;
    this.callbackURL = options.callbackURL;
    this._verify = verify;
};

SoundCloudStrategy.prototype.authenticate = function(req, options) {
    if (req.query.code) {
        this.handleCallback(req);
    } else {
        this.redirect(req);
    }
};

SoundCloudStrategy.prototype.redirect = function(req) {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    req.session.soundcloud = { state, codeVerifier };
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.clientID,
        redirect_uri: this.callbackURL,
        scope: 'non-expiring',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });
    
    req.res.redirect(`https://secure.soundcloud.com/connect?${params}`);
};

SoundCloudStrategy.prototype.handleCallback = async function(req) {
    // This will be handled in the route
    return;
};

module.exports = SoundCloudStrategy;

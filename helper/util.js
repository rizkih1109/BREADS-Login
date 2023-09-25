module.exports = {
    isLoggedIn: function (req, res, next) {
        console.log(req.session.user)
        if (req.session.user) {
            next()
        } else {
            res.redirect('/')
        }
        console.log('LOGGED')
    }
}
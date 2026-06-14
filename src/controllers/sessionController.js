// GET /api/v1/session
const getSession = (req, res) => {
  if (req.session && req.session.passport) {
    return res.status(200).json({
      status: 'success',
      message: 'Sesión activa.',
      payload: {
        sessionId: req.sessionID,
        user: req.session.passport.user,
        cookie: req.session.cookie
      }
    });
  }

  res.status(401).json({
    status: 'error',
    message: 'No hay sesión activa.'
  });
};

module.exports = {
  getSession
};

const jwt = require('jsonwebtoken');

// Middleware per autenticazione e autorizzazione
function authMiddleware(minRole) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Controlla che ci sia un token nel formato Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token mancante o non valido' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verifica e decodifica il token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Controllo del ruolo minimo
      if (decoded.ruolo_id < minRole) {
        return res.status(403).json({ message: 'Accesso non autorizzato' });
      }

      // Salva i dati dell’utente nel request per usarli nei controller
      req.user = decoded;
      next();

    } catch (err) {
      console.error('Errore nel middleware auth:', err);
      res.status(403).json({ message: 'Token non valido o scaduto' });
    }
  };
}

module.exports = authMiddleware;
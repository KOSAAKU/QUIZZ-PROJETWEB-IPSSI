export function logger(req, res) {
  const date = new Date();

  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const annee = date.getFullYear();

  const heures = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const secondes = String(date.getSeconds()).padStart(2, '0');

  const dateFormatee = `${jour}/${mois}/${annee} - ${heures}:${minutes}:${secondes}`;

  const IP = req.ip;
  const METHOD = req.method;
  const URL = req.originalUrl;
  console.log(`[${dateFormatee}] ${IP} ${METHOD} ${URL}`);
}
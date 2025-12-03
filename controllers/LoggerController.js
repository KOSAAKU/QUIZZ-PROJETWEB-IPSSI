export function logger(req, res) {
<<<<<<< HEAD
const date = new Date();
=======
    const date = new Date();
>>>>>>> 73c5c3498810c131549a486a3565f5be2b0859d4

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
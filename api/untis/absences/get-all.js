import { getAbsences } from '../../../helpers/untis';

export default async function getToday(req, res) {
    const email = req.session.user.email;
    process.stdout.write(`➡️ Getting all absences for ${email}`);
    const absenceData = await getAbsences(email);
    console.log(' ✅');    
    res.json(absenceData);
}

import { getYearTimetable } from '../../../helpers/untis';

export default async function getYear(req, res) {
    const email = req.session.user.email;
    process.stdout.write(`➡️ Getting year timetable for ${email}`);
    const year = await getYearTimetable(email);
    console.log(' ✅');
    res.json(year);
}

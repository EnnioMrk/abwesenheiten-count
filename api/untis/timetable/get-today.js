import { getTodayTimetable } from '../../../helpers/untis';

export default async function getToday(req, res) {
    const email = req.session.user.email;
    process.stdout.write(`➡️ Getting today timetable for ${email}`);
    const today = await getTodayTimetable(email);
    console.log(' ✅');    res.json(today);
}

import { getUserData } from '../../../helpers/untis';

export default async function getYear(req, res) {
    const email = req.session.user.email;
    process.stdout.write(`➡️ Getting user data for ${email}`);
    const year = await getUserData(email);
    console.log(' ✅');
    res.json(year);
}

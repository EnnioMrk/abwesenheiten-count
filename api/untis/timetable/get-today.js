import { getTodayTimetable } from "../../../helpers/untis";

export default async function getToday(req, res) {
  const email = req.session.user.email;
  const today = await getTodayTimetable(email);
  res.json(today);
}

import { getYearTimetable } from "../../../helpers/untis";

export default async function getYear(req, res) {
  const email = req.session.user.email;
  const year = await getYearTimetable(email);
  res.json(year);
}

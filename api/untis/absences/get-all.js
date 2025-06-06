import { getAbsences } from "../../../helpers/untis";

export default async function getToday(req, res) {
  const email = req.session.user.email;
  const absenceData = await getAbsences(email);
  res.json(absenceData);
}

import { getAllLessonCount } from "../../../helpers/untis";

export default async function getToday(req, res) {
  const email = req.session.user.email;
  const lessonDataByDate = await getAllLessonCount(email);

  if (!lessonDataByDate) {
    return res.status(500).json({ error: "Failed to fetch lesson data" });
  }

  // Aggregate counts by subject
  const aggregatedData = { total: {}, cancelled: {} };

  // Aggregate total lessons
  for (const date in lessonDataByDate.total) {
    for (const subject in lessonDataByDate.total[date]) {
      aggregatedData.total[subject] =
        (aggregatedData.total[subject] || 0) +
        lessonDataByDate.total[date][subject];
    }
  }

  // Aggregate cancelled lessons
  for (const date in lessonDataByDate.cancelled) {
    for (const subject in lessonDataByDate.cancelled[date]) {
      aggregatedData.cancelled[subject] =
        (aggregatedData.cancelled[subject] || 0) +
        lessonDataByDate.cancelled[date][subject];
    }
  }

  res.json(aggregatedData);
}

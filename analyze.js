import { getAllLessonCount, getAllLessonCountAllMonths } from "./utils";

const data = await (await Bun.file("timetable.json")).json();

console.log(await getAllLessonCountAllMonths(data));

import { WebUntisQR } from "webuntis";
import { getUntisUrl } from "./db";
import { URL } from "url";
import { authenticator as Authenticator } from "otplib";

const sessions = [];

export async function loginWithUrl(email, QRCodeData) {
  if (!QRCodeData) {
    QRCodeData = await getUntisUrl(email);
  }

  if (!QRCodeData) {
    return null;
  }

  const untis = new WebUntisQR(
    QRCodeData,
    "custom-identity",
    Authenticator,
    URL
  );

  await untis.login();

  sessions.push({
    email,
    untis,
  });

  return untis.username;
}

function getSession(email) {
  return sessions.find((session) => session.email == email);
}

/*export async function getSchoolYearStart() {
  //check if current month is after june
  const date = new Date();
  let year;
  if (date.getMonth() > 6) {
    year = date.getFullYear();
  } else {
    year = date.getFullYear() - 1;
  }
  const res = await fetch(`https://ferien-api.de/api/v1/holidays/NI/${year}`);
  const data = await res.json();
  return data.filter((h) => h.name.includes("sommerferien"))[0].end;
}*/

export async function getSchoolYearStart() {
  const date = new Date();
  let year;
  if (date.getMonth() > 6) {
    year = date.getFullYear();
  } else {
    year = date.getFullYear() - 1;
  }
  const res = await fetch(
    `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NI&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${
      year + 1
    }-12-30`
  );
  const data = await res.json();
  //Sommerferien [0]
  return data.filter((h) => h.name[0].text == "Halbjahresferien")[1].endDate;
}

async function validateSession(session, email) {
  if (!session) {
    let QRCodeData = await getUntisUrl(email);
    if (!QRCodeData) {
      return null;
    }

    const username = await loginWithUrl(email, QRCodeData);
  } else {
    if (!(await session.untis.validateSession())) {
      await session.untis.login();
    }
  }
  return true;
}

export async function getYearTimetable(email) {
  let session = getSession(email);

  if (!(await validateSession(session, email))) {
    return null;
  }
  session = getSession(email);

  let schoolYearStart = new Date(
    //(await session.untis.getCurrentSchoolyear()).startDate
    (await getSchoolYearStart()).slice(0, 10)
  );
  //schoolYearStart.setDate(schoolYearStart.getDate() + 2);

  let timetableData = await session.untis.getOwnTimetableForRange(
    schoolYearStart,
    new Date()
  );
  return timetableData;
}

export async function getTodayTimetable(email) {
  let session = getSession(email);

  if (!(await validateSession(session, email))) {
    return null;
  }
  session = getSession(email);

  return await session.untis.getOwnTimetableForToday();
}

export async function getAllLessonCount(email) {
  let timetable = await getYearTimetable(email);

  if (!timetable) {
    return null;
  }

  //key is day, value is object of lessons and their count. {MA: 2, EN: 3}
  let totalLessons = {};
  let cancelledLessons = {};

  timetable.forEach((lesson) => {
    lesson.date = lesson.date.toString();
    let date = `${lesson.date.slice(0, 4)}-${lesson.date.slice(
      4,
      6
    )}-${lesson.date.slice(6, 8)}`;
    if (!lesson.su[0]?.name) return;
    let subject = `${lesson.su[0]?.name}`;

    if (lesson.code === "cancelled") {
      if (!cancelledLessons[date]) {
        cancelledLessons[date] = {};
      }

      if (!cancelledLessons[date][subject]) {
        cancelledLessons[date][subject] = 0;
      }

      cancelledLessons[date][subject]++;
    } else {
      if (!totalLessons[date]) {
        totalLessons[date] = {};
      }

      if (!totalLessons[date][subject]) {
        totalLessons[date][subject] = 0;
      }

      totalLessons[date][subject]++;
    }
  });

  //sort object by date
  let totalLessonsOrdered = {};
  Object.keys(totalLessons)
    .sort()
    .forEach(function (key) {
      totalLessonsOrdered[key] = totalLessons[key];
    });

  let cancelledLessonsOrdered = {};
  Object.keys(cancelledLessons)
    .sort()
    .forEach(function (key) {
      cancelledLessonsOrdered[key] = cancelledLessons[key];
    });

  return {
    total: totalLessonsOrdered,
    cancelled: cancelledLessonsOrdered,
  };
}

function calculateLessonTimes(start, end) {
  //["740","825","935","10","1110",]

  start = start.toString().padStart(4, "0");
  end = end.toString().padStart(4, "0");
  let hourDifference = parseInt(end.slice(0, 2)) - parseInt(start.slice(0, 2));
  let minuteDifference =
    parseInt(end.slice(2, 4)) - parseInt(start.slice(2, 4));
  let duration = hourDifference * 60 + minuteDifference;
  let lessonTimes = (duration - (duration % 45)) / 45;
  if (parseInt(start) <= 915 && parseInt(end) >= 1130) {
    lessonTimes -= 1;
  }
  return lessonTimes;
}

export async function getAbsences(email) {
  let session = getSession(email);

  if (!(await validateSession(session, email))) {
    return null;
  }
  session = getSession(email);

  let schoolYearStart = new Date(
    //(await session.untis.getCurrentSchoolyear()).startDate
    (await getSchoolYearStart()).slice(0, 10)
  );
  schoolYearStart.setDate(schoolYearStart.getDate() + 2);

  let timetable = await getYearTimetable(email);
  let dateKeyTimetable = {};
  timetable.forEach((lesson) => {
    lesson.date = lesson.date.toString();
    let date = `${lesson.date.slice(0, 4)}-${lesson.date.slice(
      4,
      6
    )}-${lesson.date.slice(6, 8)}`;
    if (!dateKeyTimetable[date]) {
      dateKeyTimetable[date] = [];
    }
    dateKeyTimetable[date].push(lesson);
  });

  let absences = (
    await session.untis.getAbsentLesson(schoolYearStart, new Date())
  ).absences;

  let absencesWithDate = {};
  absences.forEach((absence) => {
    let startDate = absence.startDate;
    let endDate = absence.endDate;

    if (startDate !== endDate) {
      for (let i = startDate; i <= endDate; i++) {
        let date = i.toString();
        let dateStr = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(
          6,
          8
        )}`;
        if (!absencesWithDate[dateStr]) {
          absencesWithDate[dateStr] = [];
        }

        if (i === startDate) {
          absencesWithDate[dateStr].push({
            ...absence,
            date: dateStr,
            endTime: 1700,
          });
        } else if (i === endDate) {
          absencesWithDate[dateStr].push({
            ...absence,
            date: dateStr,
            startTime: 740,
          });
        } else {
          absencesWithDate[dateStr].push({
            ...absence,
            date: dateStr,
            startTime: 740,
            endTime: 1700,
          });
        }
      }
    } else {
      let date = startDate.toString();
      let dateStr = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(
        6,
        8
      )}`;
      if (!absencesWithDate[dateStr]) {
        absencesWithDate[dateStr] = [];
      }

      absencesWithDate[dateStr].push({
        ...absence,
        date: dateStr,
      });
    }
  });

  let absentLessons = {};

  Object.keys(absencesWithDate).forEach((date) => {
    absencesWithDate[date].forEach((absence) => {
      let dayTimetable = dateKeyTimetable[date];
      if (!dayTimetable) {
        return;
      }

      dayTimetable.forEach((lesson) => {
        if (lesson.code === "cancelled") return;
        if (
          lesson.startTime >= absence.startTime &&
          lesson.startTime <= absence.endTime
        ) {
          let lessonTimes;
          if (lesson.endTime <= absence.endTime) {
            lessonTimes = calculateLessonTimes(
              lesson.startTime,
              lesson.endTime
            );
          } else {
            lessonTimes = calculateLessonTimes(
              lesson.startTime,
              absence.endTime
            );
          }

          if (lessonTimes == 0) return;

          if (!absentLessons[date]) {
            absentLessons[date] = [];
          }

          absentLessons[date].push({
            lesson: lesson,
            absence: absence,
            lessonTimes,
          });
        }
      });
    });
  });

  return absentLessons;
}

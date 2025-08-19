import { WebUntisQR } from 'webuntis';
import { getUntisUrl } from './db.js';
import { URL } from 'url';
import { authenticator as Authenticator } from 'otplib';
import logger from '../services/logger.js';

const sessions = [];

export async function loginWithUrl(email, QRCodeData) {
    if (!QRCodeData) {
        QRCodeData = await getUntisUrl(email);
    }

    if (!QRCodeData) {
        logger.error('No QR code data found for user');
        return null;
    }

    const untis = new WebUntisQR(
        QRCodeData,
        'custom-identity',
        Authenticator,
        URL
    );

    try {
        await untis.login();
        logger.success('Successfully logged in to Untis');
    } catch (error) {
        logger.error('Failed to login to Untis', error);
        return null;
    }

    sessions.push({
        email,
        untis,
    });

    return untis.username;
}

export function getSession(email) {
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

    //h.endDate =2025-08-13
    let filteredHolidays = data
        .filter(
            (h) =>
                h.name[0].text == 'Halbjahresferien' ||
                h.name[0].text == 'Sommerferien'
        )
        //endDate is before current date
        ?.filter((h) => new Date(h.endDate) < new Date())
        ?.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    return filteredHolidays[0]?.endDate;
}

export async function validateSession(session, email) {
    if (!session) {
        logger.info('Creating new session for user');
        let QRCodeData = await getUntisUrl(email);
        if (!QRCodeData) {
            logger.error('No QR code data found for user');
            return null;
        }

        const username = await loginWithUrl(email, QRCodeData);
    } else {
        if (!(await session.untis.validateSession())) {
            logger.info('Session expired, logging in again');
            await session.untis.login();
        }
    }
    return true;
}

export async function getUserData(email) {
    logger.info(`Getting user data for ${email}`);
    let session = getSession(email);

    let user = await session.untis
        .getStudents()
        .find((s) => s.key == session.untis.username);
    return user;
}

export async function getYearTimetable(email) {
    logger.info(`Getting timetable for year for ${email}`);
    let session = getSession(email);

    let schoolYearStart = new Date((await getSchoolYearStart()).slice(0, 10));

    //set time to 22:00
    schoolYearStart.setHours(24);
    schoolYearStart.setMinutes(0);
    schoolYearStart.setSeconds(0);

    let timetableData = await session.untis.getOwnTimetableForRange(
        schoolYearStart,
        new Date()
    );

    return timetableData;
}

export async function getTodayTimetable(email) {
    logger.info(`Getting today timetable for ${email}`);
    let session = getSession(email);

    let timetable = await session.untis.getOwnTimetableForToday();
    return timetable;
}

export async function getAllLessonCount(email) {
    logger.info(`Getting all lesson count for ${email}`);
    let timetable = await getYearTimetable(email);

    if (!timetable) {
        logger.error('Failed to get timetable');
        return null;
    }

    //key is day, value is object of lessons and their count. {MA: 2, EN: 3}
    let realLessons = {};
    let cancelledLessons = {};

    timetable.forEach((lesson) => {
        lesson.date = lesson.date.toString();
        let date = `${lesson.date.slice(0, 4)}-${lesson.date.slice(
            4,
            6
        )}-${lesson.date.slice(6, 8)}`;
        if (!lesson.su[0]?.name) return;
        let subject = `${lesson.su[0]?.name}`;

        if (lesson.code === 'cancelled') {
            if (!cancelledLessons[date]) {
                cancelledLessons[date] = {};
            }

            if (!cancelledLessons[date][subject]) {
                cancelledLessons[date][subject] = 0;
            }

            cancelledLessons[date][subject]++;
        } else {
            if (!realLessons[date]) {
                realLessons[date] = {};
            }

            if (!realLessons[date][subject]) {
                realLessons[date][subject] = 0;
            }

            realLessons[date][subject]++;
        }
    });

    //sort object by date
    let realLessonsOrdered = {};
    Object.keys(realLessons)
        .sort()
        .forEach(function (key) {
            realLessonsOrdered[key] = realLessons[key];
        });

    let cancelledLessonsOrdered = {};
    Object.keys(cancelledLessons)
        .sort()
        .forEach(function (key) {
            cancelledLessonsOrdered[key] = cancelledLessons[key];
        });

    return {
        real: realLessonsOrdered,
        cancelled: cancelledLessonsOrdered,
    };
}

function calculateLessonTimes(start, end) {
    //["740","825","935","10","1110",]

    start = start.toString().padStart(4, '0');
    end = end.toString().padStart(4, '0');
    let hourDifference =
        parseInt(end.slice(0, 2)) - parseInt(start.slice(0, 2));
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
    logger.info(`Getting absences for ${email}`);
    let session = getSession(email);

    let schoolYearStart = new Date((await getSchoolYearStart()).slice(0, 10));
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
                let dateStr = `${date.slice(0, 4)}-${date.slice(
                    4,
                    6
                )}-${date.slice(6, 8)}`;
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
                if (lesson.code === 'cancelled') return;
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

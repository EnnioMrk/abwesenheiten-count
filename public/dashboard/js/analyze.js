class annalyser {
    constructor(absencesData, timetableData) {
        this.absencesData = absencesData;
        this.timetableData = timetableData;
    }

    capitalizeFirstLetter(val) {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }

    processAbsencesData(absencesData) {
        let result = [];

        // Convert the object to an array of entries with date and absences
        for (const [date, absences] of Object.entries(absencesData)) {
            absences.forEach((absenceEntry) => {
                result.push({
                    date: new Date(date),
                    lesson: absenceEntry.lesson,
                    absence: absenceEntry.absence,
                    lessonTimes: absenceEntry.lessonTimes,
                    subject: absenceEntry.lesson.su[0]?.name,
                    teacher: absenceEntry.lesson.te[0]?.name,
                    reason: absenceEntry.absence.reason,
                    isExcused: absenceEntry.absence.isExcused,
                });
            });
        }

        // Sort by date
        result.sort((a, b) => a.date - b.date);
        this.absencesData = result;
        return result; // Return the processed data
    }

    getRecentSubjectAbsences(days) {
        const recentAbsences = this.filterAbsencesByDays(days);
        let absences = {};

        recentAbsences.forEach((absence) => {
            absences[absence.subject] = (absences[absence.subject] || 0) + 1;
        });

        Object.keys(absences).forEach((a) => {
            if (a.split('-').length < 2) return;
            absences[
                this.capitalizeFirstLetter(
                    a.split('-')[1].replace(/[0-9]/g, '').toLowerCase()
                )
            ] = absences[a];
            delete absences[a];
        });

        return absences;
    }

    filterAbsencesByDays(days, offset = 0) {
        const now = new Date();
        const startDate = new Date(now.setDate(now.getDate() - days - offset));
        const endDate = new Date(now.setDate(now.getDate() + days));

        console.log(
            `Filtering absences from ${startDate.toISOString()} to ${endDate.toISOString()}`
        );

        return this.absencesData.filter((absence) => {
            const absenceDate = new Date(absence.date);
            return absenceDate >= startDate && absenceDate <= endDate;
        });
    }

    getAbsencesBySubject() {
        const subjectCounts = {};
        this.absencesData.forEach((absence) => {
            const subject = absence.subject;
            if (subject == undefined) return;
            if (!subjectCounts[subject]) {
                subjectCounts[subject] = 0;
            }
            subjectCounts[subject] += 1;
        });
        return subjectCounts;
    } // Calculate total absence percentage based on total lessons and absences
    getTotalAbsencePercentage() {
        if (
            !this.absencesData ||
            !this.timetableData ||
            !Array.isArray(this.absencesData) ||
            !Array.isArray(this.timetableData)
        ) {
            return 0;
        }

        const totalLessons = this.timetableData.filter(
            (e) => e.code != 'cancelled'
        ).length;
        const totalAbsences = this.absencesData.length;

        if (totalLessons === 0) return 0;

        const percentage = (totalAbsences / totalLessons) * 100;
        return Math.round(percentage * 100) / 100; // Round to 2 decimal places
    }

    // Get severity level and color based on absence percentage
    getAbsenceSeverity(percentage) {
        if (percentage >= 20) {
            return {
                level: 'critical',
                color: '#DC2626',
                textColor: '#FEE2E2',
            }; // Red
        } else if (percentage >= 15) {
            return { level: 'high', color: '#EA580C', textColor: '#FED7AA' }; // Orange
        } else if (percentage >= 10) {
            return { level: 'medium', color: '#D97706', textColor: '#FEF3C7' }; // Amber
        } else if (percentage >= 5) {
            return { level: 'low', color: '#65A30D', textColor: '#DCFCE7' }; // Lime
        } else {
            return {
                level: 'excellent',
                color: '#059669',
                textColor: '#D1FAE5',
            }; // Green
        }
    }

    formatSubjectName(subject) {
        let p;
        subject = subject.split('.');
        if (subject[1] == undefined)
            return this.capitalizeFirstLetter(subject[0].toLowerCase());
        if (subject[0].startsWith('E')) p = subject[1][0];
        subject = subject[1].split('-')[1];
        if (subject == undefined) return subject;
        //last character is a number, remove it
        subject = subject.replace(/[0-9]/g, '');
        //capitalize first letter
        return (
            this.capitalizeFirstLetter(subject.toLowerCase()) +
            (p ? ` (lk)` : '')
        );
    }

    formatSubjectNames(subjects) {
        const formattedSubjects = {};
        Object.keys(subjects).forEach((subject) => {
            formattedSubjects[this.formatSubjectName(subject)] =
                subjects[subject];
        });
        return formattedSubjects;
    }
}

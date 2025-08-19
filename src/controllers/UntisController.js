/**
 * Untis Controller - handles Untis API operations
 * @module controllers/UntisController
 */

import {
    getUserData,
    getYearTimetable,
    getTodayTimetable,
    getAllLessonCount,
    getAbsences,
} from '../utils/untis.js';
import logger from '../services/logger.js';

export default class UntisController {
    /**
     * Get user data from Untis
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getUserData(req, res) {
        try {
            const email = req.session.user.email;
            logger.info(`Getting Untis user data for: ${email}`);

            const userData = await getUserData(email);

            if (userData) {
                res.json(userData);
            } else {
                res.status(404).json({ error: 'User data not found' });
            }
        } catch (error) {
            logger.error('Error getting Untis user data', error);
            res.status(500).json({ error: 'Failed to get user data' });
        }
    }

    /**
     * Get year timetable
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getYearTimetable(req, res) {
        try {
            const email = req.session.user.email;
            logger.info(`Getting year timetable for: ${email}`);

            const timetable = await getYearTimetable(email);

            if (timetable) {
                res.json(timetable);
            } else {
                res.status(404).json({ error: 'Timetable not found' });
            }
        } catch (error) {
            logger.error('Error getting year timetable', error);
            res.status(500).json({ error: 'Failed to get timetable' });
        }
    }

    /**
     * Get today's timetable
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getTodayTimetable(req, res) {
        try {
            const email = req.session.user.email;
            logger.info(`Getting today's timetable for: ${email}`);

            const timetable = await getTodayTimetable(email);

            if (timetable) {
                res.json(timetable);
            } else {
                res.status(404).json({ error: "Today's timetable not found" });
            }
        } catch (error) {
            logger.error("Error getting today's timetable", error);
            res.status(500).json({ error: "Failed to get today's timetable" });
        }
    }

    /**
     * Get all lessons count
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllLessons(req, res) {
        try {
            const email = req.session.user.email;
            logger.info(`Getting all lessons count for: ${email}`);

            const lessonDataByDate = await getAllLessonCount(email);

            if (!lessonDataByDate) {
                return res
                    .status(500)
                    .json({ error: 'Failed to fetch lesson data' });
            }

            // Aggregate counts by subject
            const aggregatedData = { real: {}, cancelled: {} };

            // Aggregate real lessons
            for (const date in lessonDataByDate.real) {
                for (const subject in lessonDataByDate.real[date]) {
                    aggregatedData.real[subject] =
                        (aggregatedData.real[subject] || 0) +
                        lessonDataByDate.real[date][subject];
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
        } catch (error) {
            logger.error('Error getting lessons count', error);
            res.status(500).json({ error: 'Failed to get lessons count' });
        }
    }

    /**
     * Get absences
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAbsences(req, res) {
        try {
            const email = req.session.user.email;
            logger.info(`Getting absences for: ${email}`);

            const absences = await getAbsences(email);

            if (absences) {
                res.json(absences);
            } else {
                res.status(404).json({ error: 'Absences data not found' });
            }
        } catch (error) {
            logger.error('Error getting absences', error);
            res.status(500).json({ error: 'Failed to get absences' });
        }
    }
}

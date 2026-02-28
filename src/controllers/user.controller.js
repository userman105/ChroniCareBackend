const prisma = require('../config/prisma');

const addDailyLog = async (req, res, next) => {
    try {
        const user_id = req.user.user_id; // from auth middleware
        const { type, data } = req.body;

        if (!type || !data) {
            return res.status(400).json({ message: 'Type and data are required' });
        }

        let logPayload = {
            user_id,
            notes: data.notes || null,
            log_date: new Date(),
        };

        if (type === 'blood_pressure') {
            const { systolic, diastolic } = data;

            if (!systolic || !diastolic) {
                return res.status(400).json({ message: 'Systolic and diastolic are required' });
            }

            const bp = await prisma.bloodPressure.create({
                data: {
                    user_id,
                    systolic,
                    diastolic,
                    measurement_date: new Date(),
                    notes: data.notes || null,
                },
            });

            logPayload.blood_pressure_id = bp.bp_id;
        }

        else if (type === 'glucose') {
            const { glucose_level } = data;

            if (!glucose_level) {
                return res.status(400).json({ message: 'Glucose level is required' });
            }

            const glucose = await prisma.glucoseLevels.create({
                data: {
                    user_id,
                    glucose_level,
                    measurement_time: new Date(),
                    notes: data.notes || null,
                },
            });

            logPayload.glucose_id = glucose.glucose_id;
        }

        else if (type === 'health_metrics') {
            const { height_cm, weight_kg } = data;

            if (!height_cm && !weight_kg) {
                return res.status(400).json({ message: 'At least height or weight is required' });
            }

            const bmi =
                height_cm && weight_kg
                    ? (weight_kg / Math.pow(height_cm / 100, 2)).toFixed(2)
                    : null;

            const metrics = await prisma.healthMetrics.create({
                data: {
                    user_id,
                    height_cm,
                    weight_kg,
                    bmi,
                    recorded_date: new Date(),
                },
            });

            logPayload.metric_id = metrics.metric_id;
        }

        else {
            return res.status(400).json({ message: 'Invalid log type' });
        }

        const log = await prisma.userLogs.create({
            data: logPayload,
        });

        res.status(201).json({
            message: 'Daily log recorded successfully',
            log_id: log.log_id,
            type,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addDailyLog,
};
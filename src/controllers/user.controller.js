const prisma = require('../config/prisma');
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const addDailyLog = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
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


const addUserDisease = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const { disease_name } = req.body;

        if (!disease_name) {
            return res.status(400).json({ message: 'disease_name is required' });
        }

        const allowedDiseases = ['DIABETES', 'HYPERTENSION', 'ASTHMA'];

        if (!allowedDiseases.includes(disease_name)) {
            return res.status(400).json({
                message: 'Invalid disease name',
                allowed: allowedDiseases,
            });
        }

        const disease = await prisma.diseases.findUnique({
            where: { disease_name },
        });

        if (!disease) {
            return res.status(404).json({ message: 'Disease not found' });
        }

        const existing = await prisma.userDisease.findUnique({
            where: {
                user_id_disease_id: {
                    user_id,
                    disease_id: disease.disease_id,
                },
            },
        });

        if (existing) {
            return res.status(409).json({ message: 'Disease already added' });
        }

        await prisma.userDisease.create({
            data: {
                user_id,
                disease_id: disease.disease_id,
            },
        });

        res.status(201).json({
            message: 'Disease added successfully',
            disease: disease_name,
        });
    } catch (error) {
        next(error);
    }
};

const addUserAllergy = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const { allergy_id, notes } = req.body;

        if (!allergy_id) {
            return res.status(400).json({ message: 'allergy_id is required' });
        }

        const allergy = await prisma.allergies.findUnique({
            where: { allergy_id },
        });

        if (!allergy) {
            return res.status(404).json({ message: 'Allergy not found' });
        }

        const existing = await prisma.userAllergies.findFirst({
            where: {
                user_id,
                allergy_id,
            },
        });

        if (existing) {
            return res.status(409).json({ message: 'Allergy already added' });
        }

        const userAllergy = await prisma.userAllergies.create({
            data: {
                user_id,
                allergy_id,
                notes: notes || null,
            },
        });

        res.status(201).json({
            message: 'Allergy added successfully',
            allergy: allergy.allergy_name,
            notes: userAllergy.notes,
        });
    } catch (error) {
        next(error);
    }
};


const addLabTest = async (req, res, next) => {
    try {
        const { test_type, result_value, result_date } = req.body;
        const image_path = req.file ? req.file.path : null;

        let ocrResponse = null;

        if (image_path) {
            const formData = new FormData();
            const fs = require('fs');

            formData.append('file', fs.createReadStream(image_path));

            const response = await axios.post(
               "http://127.0.0.1:8000/ocr", // your FastAPI
                //"https://4d18-156-193-133-185.ngrok-free.app/ocr",
                formData,
                {
                    headers: formData.getHeaders(),
                }
            );

            ocrResponse = response.data;
        }


        if (req.user.is_guest) {
            return res.status(200).json({
                message: "Guest OCR processed",
                ocr_text: ocrResponse?.text || "",
                ocr_lines: ocrResponse?.lines || [],
            });
        }

        const user_id = req.user.user_id;

        const labTest = await prisma.labTests.create({
            data: {
                user_id,
                test_type,
                result_value: result_value || null,
                result_date: new Date(result_date),
                image_path,
            },
        });

        return res.status(201).json({
            message: 'Lab test uploaded successfully',
            lab_test_id: labTest.lab_test_id,
            ocr_text: ocrResponse?.text || "",
            ocr_lines: ocrResponse?.lines || [],
        });

    } catch (error) {
        console.error(error);
        next(error);
    }
};

const getBloodPressureLogs = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        if (!user_id) return res.json({ data: [] });

        const logs = await prisma.bloodPressure.findMany({
            where: { user_id },
            orderBy: { measurement_date: 'asc' },
        });

        res.json({ data: logs });
    } catch (error) {
        next(error);
    }
};

const getGlucoseLogs = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        if (!user_id) return res.json({ data: [] });

        const logs = await prisma.glucoseLevels.findMany({
            where: { user_id },
            orderBy: { measurement_time: 'asc' },
        });

        res.json({ data: logs });
    } catch (error) {
        next(error);
    }
};

const getHealthMetricsLogs = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        if (!user_id) return res.json({ data: [] });

        const logs = await prisma.healthMetrics.findMany({
            where: { user_id },
            orderBy: { recorded_date: 'asc' },
        });

        res.json({ data: logs });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    addDailyLog,
    addLabTest,
    addUserDisease,
    addUserAllergy,
    getBloodPressureLogs,
    getGlucoseLogs,
    getHealthMetricsLogs,
};
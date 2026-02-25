const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const generateOtp = require('../utils/otp');
const sendOtpEmail = require('../services/email.service');

const register = async (req, res, next) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            gender,
            date_of_birth,
        } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await prisma.users.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                first_name,
                last_name,
                email,
                password: hashedPassword,
                gender,
                date_of_birth,
                registration_date: new Date(),
                is_activated: false,
            },
        });

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);

        await prisma.userOtp.create({
            data: {
                user_id: user.user_id,
                otp_hash: otpHash,
                expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 min
            },
        });

        await sendOtpEmail(user.email, otp);

        res.status(201).json({
            message: 'User registered. OTP sent to email.',
            user_id: user.user_id,
            email: user.email,
            is_activated: false,
        });
    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    const user = await prisma.users.findUnique({
        where: { email },
    });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const otpRecord = await prisma.userOtp.findFirst({
        where: { user_id: user.user_id },
        orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
        return res.status(400).json({ message: 'OTP not found' });
    }

    if (otpRecord.expires_at < new Date()) {
        return res.status(400).json({ message: 'OTP expired' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!isValid) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    await prisma.users.update({
        where: { user_id: user.user_id },
        data: { is_activated: true },
    });

    await prisma.userOtp.deleteMany({
        where: { user_id: user.user_id },
    });

    res.json({ message: 'Account activated successfully' });
};

module.exports = { register };
module.exports = { verifyOtp}


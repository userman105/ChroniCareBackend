const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

        let parsedDob = null;
        if (date_of_birth) {
            parsedDob = new Date(`${date_of_birth}T00:00:00.000Z`);

            if (isNaN(parsedDob.getTime())) {
                return res.status(400).json({
                    message: 'Invalid date_of_birth format. Use YYYY-MM-DD',
                });
            }
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
                date_of_birth: parsedDob, // ✅ FIXED
                registration_date: new Date(),
                is_activated: false,
            },
        });

        // 🔐 OTP generation
        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);

        await prisma.userOtp.create({
            data: {
                user_id: user.user_id,
                otp_hash: otpHash,
                expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
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

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.is_activated) {
            return res.status(403).json({ message: 'Account not activated' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const accessToken = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomUUID();
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        );

        await prisma.userSession.create({
            data: {
                user_id: user.user_id,
                refresh_token: hashedRefreshToken,
                expires_at: expiresAt,
            },
        });

        await prisma.userSession.deleteMany({
            where: {
                user_id: user.user_id,
                expires_at: { lt: new Date() },
            },
        });

        return res.status(200).json({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 900, // 15 minutes
        });

    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res) => {
    try{


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

        await prisma.$transaction([
            prisma.users.update({
                where: { user_id: user.user_id },
                data: { is_activated: true },
            }),
            prisma.userOtp.deleteMany({
                where: { user_id: user.user_id },
            }),
        ]);

    res.json({ message: 'Account activated successfully' });


    }
    catch(error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const sessions = await prisma.userSession.findMany({
            where: {
                expires_at: { gt: new Date() },
            },
        });

        let sessionId = null;

        for (const session of sessions) {
            const match = await bcrypt.compare(refresh_token, session.refresh_token);
            if (match) {
                sessionId = session.id;
                break;
            }
        }

        if (!sessionId) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        await prisma.userSession.delete({
            where: { id: sessionId },
        });

        return res.status(200).json({ message: 'Logged out successfully' });

    } catch (error) {
        next(error);
    }
};


module.exports.logout = logout;
module.exports.register = register;
module.exports.verifyOtp = verifyOtp;
module.exports.login = login;


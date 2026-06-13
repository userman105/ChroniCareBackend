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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format',
            });
        }

        let genderBool = null;

        if (gender !== undefined && gender !== null) {
            if (typeof gender !== 'string') {
                return res.status(400).json({
                    message: 'Gender must be a string (male or female)',
                });
            }

            const normalized = gender.toLowerCase();

            if (normalized === 'male') {
                genderBool = true;
            } else if (normalized === 'female') {
                genderBool = false;
            } else {
                return res.status(400).json({
                    message: 'Invalid gender value (use male/female)',
                });
            }
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
                gender: genderBool,
                date_of_birth: parsedDob,
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

        try {
            await sendOtpEmail(user.email, otp);
        } catch (err) {
            console.error('Email sending failed:', err.message);
        }

        res.status(201).json({
            message: 'User registered. OTP may be delayed.',
            user_id: user.user_id,
            email: user.email,
            is_activated: false,
        });

    } catch (error) {
        next(error);
    }
};
const generateFingerprint = (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip =
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        '';

    return crypto
        .createHash('sha256')
        .update(`${userAgent}|${ip}`)
        .digest('hex');
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
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        if (!user.is_activated) {

            // Optional: generate and send a fresh OTP automatically

            const otp = generateOtp();
            const otpHash = await bcrypt.hash(otp, 10);

            await prisma.userOtp.create({
                data: {
                    user_id: user.user_id,
                    otp_hash: otpHash,
                    expires_at: new Date(
                        Date.now() + 10 * 60 * 1000
                    ),
                },
            });

            try {
                await sendOtpEmail(user.email, otp);
            } catch (err) {
                console.error(
                    'Failed to send login OTP:',
                    err.message
                );
            }

            return res.status(403).json({
                message: 'Account not activated',
                email: user.email,
            });
        }

        const accessToken = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        const refreshToken = crypto.randomUUID();
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        const fingerprint = generateFingerprint(req);

        const expiresAt = new Date(
            Date.now() +
            Number(process.env.REFRESH_TOKEN_DAYS || 7) *
            24 *
            60 *
            60 *
            1000
        );


        await prisma.userSession.deleteMany({
            where: {
                token_fingerprint: fingerprint,
            },
        });

        await prisma.userSession.create({
            data: {
                user_id: user.user_id,
                refresh_token: hashedRefreshToken,
                token_fingerprint: fingerprint,
                expires_at: expiresAt,
            },
        });


        await prisma.userSession.deleteMany({
            where: {
                user_id: user.user_id,
                expires_at: {
                    lt: new Date(),
                },
            },
        });

        res.status(200).json({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            user_id: user.user_id,
            expires_in: 15 * 60,

            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                gender: user.gender,
                date_of_birth: user.date_of_birth,
            }
        });
    } catch (error) {
        next(error);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
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

        await prisma.$transaction([
            prisma.users.update({
                where: { user_id: user.user_id },
                data: { is_activated: true },
            }),
            prisma.userOtp.deleteMany({
                where: { user_id: user.user_id },
            }),
        ]);

        return res.status(200).json({
            message: "Account activated successfully"
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);
        return res.status(500).json({
            message: 'Internal server error'
        });
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

const resendOtp = async (req, res) => {
    const { email } = req.body;

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.userOtp.create({
        data: {
            user_id: user.user_id,
            otp_hash: otpHash,
            expires_at: new Date(Date.now() + 10 * 60 * 1000),
        },
    });

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent" });
};

const refreshToken = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        const sessions = await prisma.userSession.findMany({
            where: { expires_at: { gt: new Date() } },
        });

        let session = null;
        for (const s of sessions) {
            const match = await bcrypt.compare(refresh_token, s.refresh_token);
            if (match) {
                session = s;
                break;
            }
        }

        if (!session) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const accessToken = jwt.sign(
            { user_id: session.user_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        res.status(200).json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 15 * 60,
        });
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await prisma.users.findUnique({ where: { email } });

        // Don't reveal whether the email exists — respond the same either way
        if (!user) {
            return res.status(200).json({
                message: 'If this email exists, a reset code has been sent',
            });
        }

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);

        await prisma.userOtp.create({
            data: {
                user_id: user.user_id,
                otp_hash: otpHash,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
            },
        });

        try {
            await sendOtpEmail(user.email, otp);
        } catch (err) {
            console.error('Failed to send reset OTP:', err.message);
        }

        res.status(200).json({
            message: 'If this email exists, a reset code has been sent',
            email: user.email,
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, new_password } = req.body;

        if (!email || !otp || !new_password) {
            return res.status(400).json({
                message: 'Email, otp and new_password are required',
            });
        }

        const user = await prisma.users.findUnique({ where: { email } });

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

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await prisma.$transaction([
            prisma.users.update({
                where: { user_id: user.user_id },
                data: { password: hashedPassword },
            }),
            prisma.userOtp.deleteMany({
                where: { user_id: user.user_id },
            }),
            // Invalidate all existing sessions for security
            prisma.userSession.deleteMany({
                where: { user_id: user.user_id },
            }),
        ]);

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports.forgotPassword = forgotPassword;
module.exports.resetPassword  = resetPassword;
module.exports.refreshToken = refreshToken;
module.exports.logout = logout;
module.exports.register = register;
module.exports.verifyOtp = verifyOtp;
module.exports.login = login;
module.exports.resendOtp = resendOtp;


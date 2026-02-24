const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

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

        if (
            !first_name ||
            !last_name ||
            !email ||
            !password ||
            typeof gender !== 'boolean'
        ) {
            return res.status(400).json({
                message:
                    'first_name, last_name, email, password, and gender are required',
            });
        }

        const existingUser = await prisma.users.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email already in use',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                first_name,
                last_name,
                email,
                password: hashedPassword,
                gender,
                date_of_birth: date_of_birth
                    ? new Date(date_of_birth)
                    : null,
                registration_date: new Date(),
            },
        });

        res.status(201).json({
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            registration_date: user.registration_date,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
};
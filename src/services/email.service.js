const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOtpEmail = async (to, otp) => {
    await transporter.sendMail({
        from: `"ChroniCare" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Activate your ChroniCare account',
        html: `
      <h2>Account Activation</h2>
      <p>Your OTP code is:</p>
      <h1>${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
    });
};

module.exports = sendOtpEmail;
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  let transporter;

  // For development, use Ethereal if real credentials are not provided
  if (!process.env.EMAIL_HOST) {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('--- Using Ethereal Email for testing ---');
  } else {
    // Production/Real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  const message = {
    from: process.env.EMAIL_FROM || 'Nutmeg Manager <noreply@nutmeg.local>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(message);

  if (!process.env.EMAIL_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendEmail;

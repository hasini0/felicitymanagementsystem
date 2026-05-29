const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return null;
};

// Send event registration confirmation email
exports.sendRegistrationEmail = async (participant, event, ticketData = null) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email not configured. Skipping email send.');
    return;
  }

  // Strip the data URL prefix to get raw base64 for inline attachment
  console.log('sendRegistrationEmail called, ticketData:', ticketData ? { ticketId: ticketData.ticketId, qrCodeType: typeof ticketData.qrCode, qrCodeStart: ticketData.qrCode?.substring(0, 40) } : null);
  const qrBase64 = ticketData?.qrCode?.replace(/^data:image\/png;base64,/, '');
  console.log('QR base64 present:', !!qrBase64, '| length:', qrBase64?.length);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@felicity.iiit.ac.in',
    to: participant.email,
    subject: `Registration Confirmed: ${event.eventName}`,
    html: `
      <h2>Event Registration Successful!</h2>
      <p>Dear ${participant.firstName} ${participant.lastName},</p>
      <p>You have successfully registered for <strong>${event.eventName}</strong>.</p>
      <p><strong>Event Details:</strong></p>
      <ul>
        <li>Event: ${event.eventName}</li>
        <li>Date: ${new Date(event.eventStartDate).toLocaleDateString()}</li>
        <li>Registration Fee: ₹${event.registrationFee}</li>
        ${ticketData ? `<li>Ticket ID: ${ticketData.ticketId}</li>` : ''}
      </ul>
      ${qrBase64 ? `
        <p><strong>Your QR Code (scan at the event entrance):</strong></p>
        <img src="cid:qrcode" alt="QR Code" width="200" height="200" />
      ` : ''}
      <p>Thank you for registering!</p>
      <p>Best regards,<br/>Felicity Team</p>
    `,
    attachments: qrBase64 ? [
      {
        filename: 'qrcode.png',
        content: Buffer.from(qrBase64, 'base64'),
        contentType: 'image/png',
        cid: 'qrcode'
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Registration email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, newPassword) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email not configured. Skipping email send.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@felicity.iiit.ac.in',
    to: email,
    subject: 'Password Reset - Felicity',
    html: `
      <h2>Password Reset Successful</h2>
      <p>Your password has been reset by the administrator.</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
      <p>Please login with this password and change it immediately from your profile.</p>
      <p>Best regards,<br/>Felicity Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

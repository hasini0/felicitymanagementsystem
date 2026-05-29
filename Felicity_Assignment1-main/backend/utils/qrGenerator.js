const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate unique ticket ID
exports.generateTicketId = () => {
  return `TKT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Generate QR code for ticket
exports.generateQRCode = async (ticketData) => {
  try {
    const qrData = JSON.stringify({
      ticketId: ticketData.ticketId,
      eventId: ticketData.eventId,
      participantId: ticketData.participantId,
      eventName: ticketData.eventName,
      participantName: ticketData.participantName
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

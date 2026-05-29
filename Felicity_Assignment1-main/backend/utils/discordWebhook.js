const axios = require('axios');

// Post event to Discord via webhook
exports.postToDiscord = async (webhookUrl, event) => {
  if (!webhookUrl) return;

  const embed = {
    title: `🎉 New Event: ${event.eventName}`,
    description: event.description,
    color: 0x5865F2, // Discord blue
    fields: [
      {
        name: 'Event Type',
        value: event.eventType,
        inline: true
      },
      {
        name: 'Registration Fee',
        value: `₹${event.registrationFee}`,
        inline: true
      },
      {
        name: 'Start Date',
        value: new Date(event.eventStartDate).toLocaleDateString(),
        inline: true
      },
      {
        name: 'Registration Deadline',
        value: new Date(event.registrationDeadline).toLocaleDateString(),
        inline: true
      },
      {
        name: 'Tags',
        value: event.eventTags.join(', ') || 'N/A',
        inline: false
      }
    ],
    timestamp: new Date(),
    footer: {
      text: 'Felicity Event Management System'
    }
  };

  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
    console.log('Event posted to Discord successfully');
  } catch (error) {
    console.error('Error posting to Discord:', error.message);
  }
};

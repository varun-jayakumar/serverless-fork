// on trigger from pub/sub;
// an email should be sent from the lambda to the user with 2 min expiry window
// make a api call to the web app alsong with the time of expiry (to save it to the DB)
// or can we do it directly from here


// when the link is clicked - then this is redirected to an endpoint then the endpoint verifies is the thing is valid (then vrify user else fail verification)
const functions = require('@google-cloud/functions-framework');

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('sendEmail', cloudEvent => {
  // The Pub/Sub message is passed as the CloudEvent's data payload.
  const base64name = cloudEvent.data.message.data;

  const name = base64name
    ? Buffer.from(base64name, 'base64').toString()
    : 'World';

  console.log(`Sending Email triggered, ${name}!`);
});



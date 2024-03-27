const template = require("./template");
const dotenv = require("dotenv");
const sgMail = require("@sendgrid/mail");
const functions = require("@google-cloud/functions-framework");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pkg = require("pg");
const { Client } = pkg;

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
functions.cloudEvent("sendEmail", async (cloudEvent) => {
  console.log({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  const base64email = cloudEvent.data.message.data;
  const email = Buffer.from(base64email, "base64").toString();
  console.log(email);
  if (email) {
    try {
      await client.connect();
      const token = generateTokenHelper();
      const verificationLink = constructVerificationLink(token);
      const message = generateMessageHelper(email, verificationLink);
      const isMessageSent = sendEmail(message);
      const isUpdateSuccess = updateDBHelper(email, token);
      if (isMessageSent) {
        console.log("Email sent");
      } else {
        console.log("Email Sending Fail");
      }
    } catch (e) {
      console.log("Error connecting to DB", e);
    }
  }
});

const updateDBHelper = async (email, token) => {
  const queryText =
    'UPDATE "Users" SET verification_token = $1, "is_verificationEmail_sent" = true WHERE username = $2';

  try {
    const res = await client.query(queryText, [token, email]);
    // await client.end();
    console.log(res);
    console.log("Update successfull");
  } catch (e) {
    console.log("error updating DB", e);
  } finally {
    await client.end();
  }
};

const generateTokenHelper = (email) => {
  const expiry = "2m"; // Token expires in 1 hour
  const secretKey = process.env.TOKEN_SECRET_KEY; // Use a secure, environment-specific key
  const uniqueID = uuidv4();
  return jwt.sign({ id: uniqueID, email: email }, secretKey, {
    expiresIn: expiry,
  });
};

const constructVerificationLink = (token) => {
  const url = `http://varunjayakumar.me:3000/v1/user/verify?token=${token}`;
  return url;
};

const generateMessageHelper = (to_email, verificationLink) => {
  const msg = {
    to: to_email,
    from: "admin@varunjayakumar.me",
    subject: "CSYE6225 webapp - Verify you email",
    html: template.generateHtmlTemplate(verificationLink),
  };
  return msg;
};

const sendEmail = async (message) => {
  let emailresponse;
  try {
    console.log(`Sending Email to: ${message.to}`);
    emailresponse = await sgMail.send(message);
  } catch (e) {
    console.log(e);
    return false;
  }
  if (emailresponse[0].statusCode == 202) return true;
  else return false;
};

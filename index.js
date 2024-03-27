const template = require("./template");
const dotenv = require("dotenv");
const sgMail = require("@sendgrid/mail");
const functions = require("@google-cloud/functions-framework");
const { v4: uuidv4 } = require("uuid");
const pkg = require("pg");
const { Pool } = pkg;

const infoLog = (message) => {
  const entry = Object.assign({
    severity: "INFO",
    message: message,
  });
  console.log(JSON.stringify(entry));
};

const errorLog = (message) => {
  const entry = Object.assign({
    severity: "ERROR",
    message: message,
  });
  console.log(JSON.stringify(entry));
};
let pool;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

functions.cloudEvent("sendEmail", async (cloudEvent) => {
  try {
    pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });
    infoLog({
      message: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      },
    });
    const base64email = cloudEvent.data.message.data;
    const email = Buffer.from(base64email, "base64").toString();
    infoLog(`recieved verfication process for username: ${email}`);
    if (email) {
      try {
        const token = generateTokenHelper();
        const verificationLink = constructVerificationLink(token, email);
        const message = generateMessageHelper(email, verificationLink);
        const isMessageSent = sendEmail(message);
        const now = new Date();
        const twoMinutesInMilliseconds = 2 * 60 * 1000; // Convert 2 minutes to milliseconds
        const validity = new Date(now.getTime() + twoMinutesInMilliseconds); // Add 2 minutes to 'now'
        if (isMessageSent) {
          infoLog(`Verification email sent for user: ${email}`);
          const isUpdateSuccess = updateDBHelper(email, token, validity);
        } else {
          errorLog(`Verification email failed sending for username: ${email}`);
        }
      } catch (e) {
        errorLog({ message: "Error connecting to DB" });
      }
    }
  } catch (e) {
    errorLog(e);
  }
});

const updateDBHelper = async (email, token, validity) => {
  const queryText =
    'UPDATE "Users" SET verification_token = $1, "is_verificationEmail_sent" = true, "token_valid_until" = $2 WHERE username = $3';

  try {
    const res = await pool.query(queryText, [token, validity, email]);
    infoLog(`DB Update successful : ${email}`);
  } catch (e) {
    errorLog("error updating DB");
    errorLog(e);
  } finally {
    await pool.end();
  }
};

const generateTokenHelper = () => {
  return uuidv4();
};

const constructVerificationLink = (token, email) => {
  const url = `http://varunjayakumar.me:3000/v1/user/verify?token=${token}&username=${email}`;
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
    emailresponse = await sgMail.send(message);
  } catch (e) {
    errorLog({ message: "Failed sending email", error: e });
    return false;
  }
  if (emailresponse[0].statusCode == 202) return true;
  else return false;
};

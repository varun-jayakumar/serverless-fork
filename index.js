import generateHtmlTemplate from "./template.js";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import functions from "@google-cloud/functions-framework";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

functions.cloudEvent("sendEmail", (cloudEvent) => {
  const base64email = cloudEvent.data.message.data;
  const email = Buffer.from(base64email, "base64").toString();

  if (email) {
    console.log(`Sending Email to: ${email}`);
    const token = generateTokenHelper();
    const verificationLink = constructVerificationLink(token);
    const message = generateMessageHelper(email, verificationLink);
    const isMessageSent = sendEmail(message);
    if (isMessageSent) {
      console.log("Email sent");
    } else {
      console.log("Email Sending Fail");
    }
  }
});

const generateTokenHelper = (email) => {
  const expiry = "2m"; // Token expires in 1 hour
  const secretKey = process.env.TOKEN_SECRET_KEY; // Use a secure, environment-specific key
  const uniqueID = uuidv4();
  return jwt.sign({ id: uniqueID, email: email }, secretKey, {
    expiresIn: expiry,
  });
};

const constructVerificationLink = (token) => {
  const url = `http://varunjayakumar.me:3000/user/verify?token=${token}`;
  return url;
};

const generateMessageHelper = (to_email, verificationLink) => {
  const msg = {
    to: to_email,
    from: "admin@varunjayakumar.me",
    subject: "CSYE6225 webapp - Verify you email",
    html: generateHtmlTemplate(verificationLink),
  };
  return msg;
};

const sendEmail = async (message) => {
  let emailresponse;
  try {
    emailresponse = await sgMail.send(message);
  } catch (e) {
    console.log(e);
    return false;
  }
  if (emailresponse[0].statusCode == 202) return true;
  else return false;
};

// on trigger from pub/sub; (email of the user)
// an email should be sent from the lambda to the user with 2 min expiry window
// make a api call to the web app alsong with the time of expiry (to save it to the DB)
// or can we do it directly from here

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNhM2FlMTNkLWViYTEtNGQ1Yi1iNDM1LTdmMDNjNjk1NmNkMCIsImlhdCI6MTcxMTMxOTY1NCwiZXhwIjoxNzExMzE5Nzc0fQ.5wx1-w5Ggi5ni1tG8fxXPW0DmR1KviaFiVb5bQq_924

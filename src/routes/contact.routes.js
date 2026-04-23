import { Router } from "express";
import { contactForm, getAssessmentChallenge } from "../controllers/contact.controller.js";

const contactRoute = Router();

contactRoute.get("/assessment-challenge", getAssessmentChallenge);
contactRoute.post("/", contactForm);

export default contactRoute;
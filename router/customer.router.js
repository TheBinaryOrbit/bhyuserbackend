import  {GetOTP, verifyOTP , createUser , getCustomerProfile} from "../controllers/customer.controller.js";
import express from "express";
import verifyTokenMiddleware from "../middleware/auth.middleware.js";


const customerRouter = express.Router();

customerRouter.post("/get-otp", GetOTP);
customerRouter.post("/verify-otp", verifyOTP);
customerRouter.post("/create-user", createUser);

customerRouter.use(verifyTokenMiddleware);
customerRouter.get("/profile/:customerId", getCustomerProfile);

export default customerRouter;

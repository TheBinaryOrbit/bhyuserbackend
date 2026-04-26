import  {GetOTP, verifyOTP , createUser , getCustomerProfile, updateCustomer} from "../controllers/customer.controller.js";
import express from "express";
import verifyTokenMiddleware from "../middleware/auth.middleware.js";


const customerRouter = express.Router();

customerRouter.post("/get-otp", GetOTP);
customerRouter.post("/verify-otp", verifyOTP);
customerRouter.post("/create-user", createUser);

customerRouter.use(verifyTokenMiddleware);
customerRouter.get("/profile/:customerId", getCustomerProfile);
customerRouter.put("/update/:customerId", updateCustomer);

export default customerRouter;

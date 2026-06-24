import { Request, Response } from "express";
import { loginService } from "../services/auth.services";

export const login = async (req:Request , res: Response)=>{
try {
    const {email,password} = req.body;
    const result= await loginService(email, password);
    return res.status(200).json({message: 'login Successful', data:result});
    
    
} catch (error:any) {
    return res.status(401).json({message: error.message});
}
}
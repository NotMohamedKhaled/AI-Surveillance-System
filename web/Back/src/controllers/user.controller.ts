import { Request, Response } from "express";

import { 
    allUsers,
    userById,
    createUserr,
    updateUserr,
    restoreUserr,
    deleteUserr,
    userMe,
    changePassword} from "../services/user.service";
import { IUser, UserRole } from "../models/user.model";



export const getUserMe = async (req:Request, res:Response)=>{
    try {
        const {id} = req.user;
        const userInfo = await userMe(id);
        return res.status(200).json({message:"logged in user info",data:userInfo})
    } catch (error:any) {
            return res.status(404).json({message: error.message});
    }
}
import { onlineUsers } from "../sockets";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const rawUsers = await allUsers(req.user.role as UserRole);
    const users = rawUsers.map((u: any) => ({
      ...u,
      isOnline: onlineUsers.has(String(u._id))
    }));
    res.status(200).json({ message: "Users list", data: users });
  } catch (error: any) {
    return res.status(404).json({ message: error?.message || "message" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
try {
    const id = req.params.id as string;
    const user = await userById(id);
    res.status(200).json({message:"User data",data:user});
} catch (error:any) {
    return res.status(404).json({message: error.message});    
}
};


export const createUser =async (req: Request, res: Response) => {
try {
    const userInfo = req.body as IUser
    const user = await createUserr(userInfo);
    res.status(200).json({message:"User craeted successfully",data:user});
} catch (error:any) {
    return res.status(404).json({message: error.message});    
}
};

export const updateUser =  async (req: Request, res: Response) => {
try {
      const  id  = req.params.id as string;
  const updatedUser = await updateUserr(id, req.body);
  res.status(200).json({message:"user updated successfully",data:updatedUser});
} catch (error:any) {
           return res.status(404).json({message: error.message});    
}
};
export const deleteUser =  async (req: Request, res: Response) => {
try {
 const id = req.params.id as string;
   const deletedUser = await deleteUserr(id);

  res.status(200).json({message:'User account deleted',data:deletedUser});
} catch (error:any) {
       return res.status(404).json({message: error.message});

}
};

export const restoreUser =  async (req: Request, res: Response) => {
try {
 const id = req.params.id as string;
   const restoredUser = await restoreUserr(id);

  res.status(200).json({message:'User account restored',data:restoredUser});
} catch (error:any) {
       return res.status(404).json({message: error.message});

}
};

export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;
    const result = await changePassword(id, currentPassword, newPassword);
    return res.status(200).json({ message: result.message });
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
};
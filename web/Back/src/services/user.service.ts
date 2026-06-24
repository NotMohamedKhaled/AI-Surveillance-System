import User, { IUser, UpdateUserInput, UserRole } from "../models/user.model";
import bcrypt from "bcrypt";

export const userMe = async (id: string) => {
     const user = await User.findById(id)
          .where({ isDeleted: false })
          .select('-password')
          .lean();
     if (!user) {
          throw new Error('User data not found')
     }
     return user;
}

// import { getPagination } from "../utils/pagination";

// export const allUsers = async (query: any= {}) => {
//   const { page, limit, skip } = getPagination(query);

//   const users = await User.find()
//     .skip(skip)
//     .limit(limit);

//   const total = await User.countDocuments();

//   return {
//     data: users,
//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     },
//   };
// };

export const allUsers = async (role: UserRole) => {
  if (role === UserRole.SUPER_ADMIN) {
    const users = await User.find().select("-password").lean();
    if (!users) throw new Error("error in database");
    return users;
  }
  const users = await User.find({ isDeleted: false }).select("-password").lean();
  if (!users) throw new Error("error in database");
  return users;
};

export const userById = async (id: string) => {
     const user = await User.findById(id).where({ isDeleted: false }).select('-password').lean()
     if (!user) {
          throw new Error('User not found')
     }
     return user;
}
export const createUserr = async (userInfo: IUser) => {
     const notValidEmail = await User.findOne({ email: userInfo.email });
     if (notValidEmail) {
          throw new Error('Email is already used')
     }
     const notValidPhone = await User.findOne({ phone: userInfo.phone });
     if (notValidPhone) {
          throw new Error('This phone number is already used')
     }
     
     const user = await User.create(userInfo);
     return user;
}    



export const updateUserr = async (id: string, updateData:UpdateUserInput) => { // should take the id and the data that will update to it 
 const user = await User.findOne({
    _id: id,
    isDeleted: false,
  }).select("-password");

  if (!user) {
    throw new Error("user not found");
  }

     Object.assign(user, updateData);

  await user.save(); 

  return user;


}

export const restoreUserr =async (id: string)=>{
  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isDeleted) {
    throw new Error("User is already active");
  }

  user.isDeleted = false;

  await user.save();

  return user;
}
export const deleteUserr = async (id:string) => { 
      const user = await User.findByIdAndUpdate(id,{isDeleted:true},{ new: true,runValidators: true,});

  if (!user) {
    throw new Error("User not found");
  }
  return user;

}

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });

  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully" };
}